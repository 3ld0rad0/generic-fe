import os
import re
import secrets
import sqlite3
import threading
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Body, Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from .auth import Auth
from .db import ACTIVITIES, open_db

DATE_RE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
TIME_RE = re.compile(r"([01][0-9]|2[0-3]):[0-5][0-9]")
EMAIL_RE = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")

MAX_BODY_BYTES = 10 * 1024
MAX_BULK_DATES = 366
LOGIN_MAX_FAILURES = 5
LOGIN_WINDOW_S = 5 * 60

SLOT_COLUMNS = "SELECT id, activity, date, time, price_cents FROM slots"


def _is_pos_int(n):
    return type(n) is int and n > 0


def _is_str(v):
    return isinstance(v, str)


def _today():
    return datetime.now(timezone.utc).date().isoformat()


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


def create_app(db, admin_password, secret, static_dir=None):
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    auth = Auth(admin_password, secret)
    lock = threading.Lock()
    failures: dict[str, tuple[int, float]] = {}

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
        return [dict(r) for r in rows]

    @app.post("/api/bookings", status_code=201)
    def create_booking(body: dict[str, Any] | None = Body(default=None)):
        b = body or {}
        slot_id, name, email, phone, players = (
            b.get("slotId"), b.get("name"), b.get("email"), b.get("phone"), b.get("players"),
        )
        if not _is_pos_int(slot_id):
            raise _bad("Sessione non valida")
        if not _is_str(name) or not name.strip() or len(name) > 100:
            raise _bad("Nome non valido")
        if not _is_str(email) or not EMAIL_RE.fullmatch(email) or len(email) > 200:
            raise _bad("Email non valida")
        if not _is_str(phone) or len(phone.strip()) < 5 or len(phone) > 30:
            raise _bad("Telefono non valido")
        if not _is_pos_int(players) or players > 100:
            raise _bad("Numero partecipanti non valido")

        with tx():
            slot = db.execute(f"{SLOT_COLUMNS} WHERE id = ?", (slot_id,)).fetchone()
            if slot is None:
                raise HTTPException(404, "Sessione non trovata")
            if slot["date"] < _today():
                raise _bad("Sessione già passata")
            cur = db.execute(
                "INSERT INTO bookings (slot_id, name, email, phone, players) VALUES (?, ?, ?, ?, ?)",
                (slot_id, name.strip(), email.strip(), phone.strip(), players),
            )
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
