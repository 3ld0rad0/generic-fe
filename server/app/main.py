import os
import re
import secrets
import sqlite3
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import Body, Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from .auth import Auth
from .db import ACTIVITIES, open_db

DATE_RE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
TIME_RE = re.compile(r"([01][0-9]|2[0-3]):[0-5][0-9]")
EMAIL_RE = re.compile(
    r"[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
    r"@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}"
)
# Inizia con una lettera: esclude anche i prefissi =,+,-,@ delle formule nei fogli di calcolo.
NAME_RE = re.compile(r"[^\W\d_](?:[^\W\d_]|[ '’.\-])+")
PHONE_RE = re.compile(r"\+?[0-9 ().\-]+")
PHONE_MIN_DIGITS, PHONE_MAX_DIGITS = 6, 15

MAX_BODY_BYTES = 10 * 1024
MAX_BULK_DATES = 366
LOGIN_MAX_FAILURES = 5
LOGIN_WINDOW_S = 5 * 60
BOOKING_IP_MAX = 3
BOOKING_IP_WINDOW_S = 60 * 60
MAX_ACTIVE_PER_CONTACT = 3
BOOKING_CUTOFF = timedelta(hours=1)
# Gli orari dei turni sono locali al poligono.
TZ = ZoneInfo(os.environ.get("APP_TZ", "Europe/Rome"))

SLOT_COLUMNS = "SELECT id, activity, date, time, price_cents FROM slots"


def _is_pos_int(n):
    return type(n) is int and n > 0


def _is_str(v):
    return isinstance(v, str)


def _now():
    return datetime.now(TZ)


def _today():
    return _now().date().isoformat()


def _starts_at(slot):
    return datetime.fromisoformat(f"{slot['date']}T{slot['time']}").replace(tzinfo=TZ)


def _bookable(slot):
    return _starts_at(slot) - _now() >= BOOKING_CUTOFF


def _bad(msg):
    return HTTPException(400, msg)


def _slot_fields(b):
    activity, time_, price = b.get("activity"), b.get("time"), b.get("priceCents")
    if activity not in ACTIVITIES:
        raise _bad("Attività non valida")
    if not _is_str(time_) or not TIME_RE.fullmatch(time_):
        raise _bad("Ora non valida")
    if type(price) is not int or price < 0:
        raise _bad("Prezzo non valido")
    return activity, time_, price


def _valid_date(date):
    return _is_str(date) and DATE_RE.fullmatch(date)


def _clean_name(v):
    name = " ".join(v.split()) if _is_str(v) else ""
    return name if 2 <= len(name) <= 100 and NAME_RE.fullmatch(name) else None


def _clean_email(v):
    email = v.strip().lower() if _is_str(v) else ""
    local = email.partition("@")[0]
    return email if len(email) <= 254 and len(local) <= 64 and EMAIL_RE.fullmatch(email) else None


def _clean_phone(v):
    phone = v.strip() if _is_str(v) else ""
    if len(phone) > 30 or not PHONE_RE.fullmatch(phone):
        return None
    if "+" in phone[1:] or phone.count("(") != phone.count(")"):
        return None
    compact = re.sub(r"[ ().\-]", "", phone)
    digits = compact.lstrip("+")
    return compact if PHONE_MIN_DIGITS <= len(digits) <= PHONE_MAX_DIGITS else None


def create_app(db, admin_password, secret, static_dir=None):
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    auth = Auth(admin_password, secret)
    lock = threading.Lock()
    failures: dict[str, tuple[int, float]] = {}
    recent_bookings: dict[str, list[float]] = {}

    @contextmanager
    def tx():
        # BEGIN IMMEDIATE serializza le scritture.
        with lock:
            db.execute("BEGIN IMMEDIATE")
            try:
                yield
                db.execute("COMMIT")
            except BaseException:
                db.execute("ROLLBACK")
                raise

    @app.middleware("http")
    async def limit_body(request: Request, call_next):
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
            return JSONResponse({"error": "Richiesta troppo grande"}, status_code=413)
        return await call_next(request)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request, exc):
        return JSONResponse({"error": exc.detail}, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return JSONResponse({"error": "Richiesta non valida"}, status_code=400)

    @app.exception_handler(Exception)
    async def unhandled_error(request, exc):
        return JSONResponse({"error": "Errore interno"}, status_code=500)

    @app.post("/api/admin/login")
    def login(request: Request, body: dict[str, Any] | None = Body(default=None)):
        ip = request.client.host if request.client else "unknown"
        count, until = failures.get(ip, (0, 0.0))
        active = until > time.time()
        if active and count >= LOGIN_MAX_FAILURES:
            raise HTTPException(429, "Troppi tentativi, riprova tra poco")
        token = auth.login((body or {}).get("password"))
        if not token:
            failures[ip] = ((count + 1) if active else 1, time.time() + LOGIN_WINDOW_S)
            raise HTTPException(401, "Password errata")
        failures.pop(ip, None)
        return {"token": token}

    # Pubblico: slot futuri
    @app.get("/api/slots")
    def list_slots(request: Request):
        from_ = request.query_params.get("from", "")
        if not DATE_RE.fullmatch(from_):
            from_ = _today()
        activity = request.query_params.get("activity")
        if activity is not None and activity not in ACTIVITIES:
            raise _bad("Attività non valida")
        with lock:
            rows = db.execute(
                f"{SLOT_COLUMNS} WHERE date >= ? AND (? IS NULL OR activity = ?) ORDER BY date, time, activity",
                (from_, activity, activity),
            ).fetchall()
        return [{**dict(r), "bookable": _bookable(r)} for r in rows]

    @app.post("/api/bookings", status_code=201)
    def create_booking(request: Request, body: dict[str, Any] | None = Body(default=None)):
        ip = request.client.host if request.client else "unknown"
        now_s = time.time()
        recent = [t for t in recent_bookings.get(ip, []) if t > now_s - BOOKING_IP_WINDOW_S]
        if len(recent) >= BOOKING_IP_MAX:
            recent_bookings[ip] = recent
            raise HTTPException(429, "Troppe prenotazioni da questa connessione, riprova più tardi")
        b = body or {}
        slot_id, players = b.get("slotId"), b.get("players")
        name, email, phone = _clean_name(b.get("name")), _clean_email(b.get("email")), _clean_phone(b.get("phone"))
        if not _is_pos_int(slot_id):
            raise _bad("Sessione non valida")
        if name is None:
            raise _bad("Nome non valido")
        if email is None:
            raise _bad("Email non valida")
        if phone is None:
            raise _bad("Telefono non valido")
        if not _is_pos_int(players) or players > 100:
            raise _bad("Numero partecipanti non valido")

        with tx():
            slot = db.execute(f"{SLOT_COLUMNS} WHERE id = ?", (slot_id,)).fetchone()
            if slot is None:
                raise HTTPException(404, "Sessione non trovata")
            if not _bookable(slot):
                raise _bad("Prenotazioni chiuse: la sessione inizia tra meno di un'ora o è già passata")
            active = db.execute(
                """SELECT COUNT(*) FROM bookings b JOIN slots s ON s.id = b.slot_id
                   WHERE s.date >= ? AND (lower(b.email) = ? OR replace(b.phone, ' ', '') = ?)""",
                (_today(), email, phone),
            ).fetchone()[0]
            if active >= MAX_ACTIVE_PER_CONTACT:
                raise HTTPException(
                    429, f"Hai già {MAX_ACTIVE_PER_CONTACT} prenotazioni attive: annullane una per prenotarne un'altra"
                )
            cur = db.execute(
                "INSERT INTO bookings (slot_id, name, email, phone, players) VALUES (?, ?, ?, ?, ?)",
                (slot_id, name, email, phone, players),
            )
        recent_bookings[ip] = [*recent, now_s]
        return {"id": cur.lastrowid}

    @app.get("/api/admin/bookings", dependencies=[Depends(auth.require_admin)])
    def admin_bookings():
        with lock:
            rows = db.execute(
                """SELECT b.id, b.name, b.email, b.phone, b.players, b.created_at,
                          s.id AS slot_id, s.activity, s.date, s.time
                   FROM bookings b JOIN slots s ON s.id = b.slot_id
                   ORDER BY s.date, s.time, s.activity, b.id"""
            ).fetchall()
        return [dict(r) for r in rows]

    @app.delete("/api/admin/bookings/{booking_id}", status_code=204, dependencies=[Depends(auth.require_admin)])
    def delete_booking(booking_id: int):
        with lock:
            cur = db.execute("DELETE FROM bookings WHERE id = ?", (booking_id,))
        if not cur.rowcount:
            raise HTTPException(404, "Prenotazione non trovata")
        return Response(status_code=204)

    @app.post("/api/admin/slots", status_code=201, dependencies=[Depends(auth.require_admin)])
    def create_slot(body: dict[str, Any] | None = Body(default=None)):
        b = body or {}
        date = b.get("date")
        if not _valid_date(date):
            raise _bad("Data non valida")
        activity, time_, price = _slot_fields(b)
        try:
            with tx():
                cur = db.execute(
                    "INSERT INTO slots (activity, date, time, price_cents) VALUES (?, ?, ?, ?)",
                    (activity, date, time_, price),
                )
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Sessione già esistente")
        return {"id": cur.lastrowid}

    @app.post("/api/admin/slots/bulk", status_code=201, dependencies=[Depends(auth.require_admin)])
    def create_slots_bulk(body: dict[str, Any] | None = Body(default=None)):
        b = body or {}
        dates = b.get("dates")
        if not isinstance(dates, list) or not 0 < len(dates) <= MAX_BULK_DATES:
            raise _bad(f"Indica da 1 a {MAX_BULK_DATES} date")
        if not all(_valid_date(d) for d in dates):
            raise _bad("Data non valida")
        activity, time_, price = _slot_fields(b)
        created = 0
        with tx():
            for date in sorted(set(dates)):
                cur = db.execute(
                    "INSERT OR IGNORE INTO slots (activity, date, time, price_cents) VALUES (?, ?, ?, ?)",
                    (activity, date, time_, price),
                )
                created += cur.rowcount
        return {"created": created, "skipped": len(set(dates)) - created}

    @app.delete("/api/admin/slots/{slot_id}", status_code=204, dependencies=[Depends(auth.require_admin)])
    def delete_slot(slot_id: int):
        with lock:
            cur = db.execute("DELETE FROM slots WHERE id = ?", (slot_id,))
        if not cur.rowcount:
            raise HTTPException(404, "Sessione non trovata")
        return Response(status_code=204)

    @app.api_route("/api/{rest:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
    def api_not_found(rest: str):
        raise HTTPException(404, "Not found")

    if static_dir and Path(static_dir).is_dir():
        root = Path(static_dir).resolve()

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str):
            candidate = (root / path).resolve()
            if candidate.is_file() and candidate.is_relative_to(root):
                return FileResponse(candidate)
            return FileResponse(root / "index.html")

    return app


def create_default_app():
    admin_password = os.environ.get("ADMIN_PASSWORD")
    if not admin_password:
        raise SystemExit("ADMIN_PASSWORD non impostata")
    here = Path(__file__).resolve().parent
    return create_app(
        db=open_db(),
        admin_password=admin_password,
        secret=os.environ.get("SESSION_SECRET") or secrets.token_hex(32),
        static_dir=os.environ.get("STATIC_DIR") or here.parent.parent / "client" / "dist",
    )
