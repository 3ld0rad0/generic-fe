import pytest
from datetime import datetime

from fastapi.testclient import TestClient

from app import main
from app.db import open_db
from app.main import create_app

SLOT = {"activity": "paintball", "date": "2099-01-01", "time": "10:00", "priceCents": 2500}
PERSON = {"name": "Mario", "email": "m@x.it", "phone": "123456"}


@pytest.fixture
def api():
    sent = []
    client = TestClient(create_app(open_db(":memory:"), "pw", "s", mailer=sent.append))
    token = client.post("/api/admin/login", json={"password": "pw"}).json()["token"]
    client.admin = {"authorization": f"Bearer {token}"}
    client.sent = sent
    return client


def test_admin_routes_require_auth_and_wrong_password_is_rejected(api):
    assert api.post("/api/admin/slots", json=SLOT).status_code == 401
    assert api.post("/api/admin/login", json={"password": "x"}).status_code == 401


def test_players_is_informative_and_slot_has_no_seat_limit(api):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    book = lambda n: api.post("/api/bookings", json={"slotId": s["id"], "players": n, **PERSON}).status_code
    assert book(40) == 201
    assert book(40) == 201
    assert api.get("/api/slots").json()[0].keys() == {"id", "activity", "date", "time", "price_cents"}
    assert [b["players"] for b in api.get("/api/admin/bookings", headers=api.admin).json()] == [40, 40]


def test_validation_and_duplicate_slots(api):
    assert api.post("/api/admin/slots", json={**SLOT, "time": "25:00"}, headers=api.admin).status_code == 400
    api.post("/api/admin/slots", json=SLOT, headers=api.admin)
    assert api.post("/api/admin/slots", json=SLOT, headers=api.admin).status_code == 409
    assert api.post("/api/bookings", json={"slotId": 1, "players": 0, **PERSON}).status_code == 400


def test_bulk_creates_slots_for_many_dates_and_skips_existing(api):
    bulk = {k: v for k, v in SLOT.items() if k != "date"}
    api.post("/api/admin/slots", json=SLOT, headers=api.admin)
    r = api.post("/api/admin/slots/bulk", json={**bulk, "dates": ["2099-01-01", "2099-01-02", "2099-01-03", "2099-01-03"]}, headers=api.admin)
    assert r.status_code == 201
    assert r.json() == {"created": 2, "skipped": 1}
    assert [s["date"] for s in api.get("/api/slots").json()] == ["2099-01-01", "2099-01-02", "2099-01-03"]


def test_bulk_validation_and_auth(api):
    bulk = {k: v for k, v in SLOT.items() if k != "date"}
    assert api.post("/api/admin/slots/bulk", json={**bulk, "dates": ["2099-01-01"]}).status_code == 401
    for dates in ([], "2099-01-01", ["nope"], ["2099-01-01", 5]):
        assert api.post("/api/admin/slots/bulk", json={**bulk, "dates": dates}, headers=api.admin).status_code == 400
    assert api.post("/api/admin/slots/bulk", json={**bulk, "time": "25:00", "dates": ["2099-01-01"]}, headers=api.admin).status_code == 400
    assert api.get("/api/slots").json() == []


def test_admin_can_delete_booking(api):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    b = api.post("/api/bookings", json={"slotId": s["id"], "players": 1, **PERSON}).json()
    assert api.delete(f"/api/admin/bookings/{b['id']}", headers=api.admin).status_code == 204
    assert api.get("/api/admin/bookings", headers=api.admin).json() == []


def test_activities_share_time_and_can_be_filtered(api):
    for activity in ("paintball", "arco", "carabina"):
        assert api.post("/api/admin/slots", json={**SLOT, "activity": activity}, headers=api.admin).status_code == 201
    assert len(api.get("/api/slots").json()) == 3
    arco = api.get("/api/slots?activity=arco").json()
    assert [s["activity"] for s in arco] == ["arco"]
    assert api.get("/api/slots?activity=golf").status_code == 400


def test_invalid_activity_is_rejected(api):
    assert api.post("/api/admin/slots", json={**SLOT, "activity": "golf"}, headers=api.admin).status_code == 400
    assert api.post("/api/admin/slots", json={k: v for k, v in SLOT.items() if k != "activity"}, headers=api.admin).status_code == 400


def test_booking_on_activity_slot_reports_activity_to_admin(api):
    s = api.post("/api/admin/slots", json={**SLOT, "activity": "carabina"}, headers=api.admin).json()
    api.post("/api/bookings", json={"slotId": s["id"], "players": 2, **PERSON})
    assert api.get("/api/admin/bookings", headers=api.admin).json()[0]["activity"] == "carabina"


def test_legacy_db_is_migrated_keeping_bookings(tmp_path):
    import sqlite3

    path = str(tmp_path / "old.db")
    old = sqlite3.connect(path)
    old.executescript(
        """
        CREATE TABLE slots (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT NOT NULL,
          capacity INTEGER NOT NULL, price_cents INTEGER NOT NULL, UNIQUE (date, time));
        CREATE TABLE bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
          name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, players INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')));
        INSERT INTO slots (date, time, capacity, price_cents) VALUES ('2099-01-01', '10:00', 5, 2500);
        INSERT INTO bookings (slot_id, name, email, phone, players) VALUES (1, 'M', 'm@x.it', '123456', 2);
        """
    )
    old.close()
    db = open_db(path)
    assert db.execute("SELECT activity FROM slots").fetchone()[0] == "paintball"
    assert db.execute("SELECT COUNT(*) FROM bookings").fetchone()[0] == 1
    assert "capacity" not in [r[1] for r in db.execute("PRAGMA table_info(slots)")]


def test_db_with_capacity_and_activity_drops_capacity_keeping_bookings(tmp_path):
    import sqlite3

    path = str(tmp_path / "mid.db")
    old = sqlite3.connect(path)
    old.executescript(
        """
        CREATE TABLE slots (id INTEGER PRIMARY KEY AUTOINCREMENT, activity TEXT NOT NULL DEFAULT 'paintball',
          date TEXT NOT NULL, time TEXT NOT NULL, capacity INTEGER NOT NULL, price_cents INTEGER NOT NULL,
          UNIQUE (activity, date, time));
        CREATE TABLE bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
          name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, players INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')));
        INSERT INTO slots (activity, date, time, capacity, price_cents) VALUES ('arco', '2099-01-01', '10:00', 5, 2500);
        INSERT INTO bookings (slot_id, name, email, phone, players) VALUES (1, 'M', 'm@x.it', '123456', 2);
        """
    )
    old.close()
    db = open_db(path)
    assert [r[1] for r in db.execute("PRAGMA table_info(slots)")] == ["id", "activity", "date", "time", "price_cents"]
    assert db.execute("SELECT activity FROM slots").fetchone()[0] == "arco"
    assert db.execute("SELECT COUNT(*) FROM bookings").fetchone()[0] == 1


def _at(monkeypatch, hh_mm):
    now = datetime.fromisoformat(f"2099-01-01T{hh_mm}").replace(tzinfo=main.TZ)
    monkeypatch.setattr(main, "_now", lambda: now)


def test_confirmation_mail_contains_working_cancel_link(api):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    api.post("/api/bookings", json={"slotId": s["id"], "players": 3, **PERSON})
    (sent,) = api.sent
    assert sent["email"] == "m@x.it" and sent["players"] == 3

    token = sent["cancel_token"]
    info = api.get(f"/api/bookings/cancel/{token}").json()
    assert info["cancellable"] is True and info["date"] == "2099-01-01" and "email" not in info
    assert api.post(f"/api/bookings/cancel/{token}").status_code == 204
    assert api.get("/api/admin/bookings", headers=api.admin).json() == []
    assert api.post(f"/api/bookings/cancel/{token}").status_code == 404
    assert api.get("/api/bookings/cancel/nope").status_code == 404


def test_cancel_not_allowed_after_slot_start(api, monkeypatch):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    api.post("/api/bookings", json={"slotId": s["id"], "players": 1, **PERSON})
    token = api.sent[0]["cancel_token"]
    _at(monkeypatch, "10:00")
    assert api.get(f"/api/bookings/cancel/{token}").json()["cancellable"] is False
    assert api.post(f"/api/bookings/cancel/{token}").status_code == 400


def test_admin_bookings_do_not_expose_cancel_token(api):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    api.post("/api/bookings", json={"slotId": s["id"], "players": 1, **PERSON})
    assert "cancel_token" not in api.get("/api/admin/bookings", headers=api.admin).json()[0]


def test_confirmation_mail_text():
    from app.mail import booking_message

    msg = booking_message(
        {"name": "Mario", "email": "m@x.it", "players": 2, "activity": "arco", "date": "2099-01-01",
         "time": "10:00", "price_cents": 2500, "cancel_token": "abc"},
        "from@x.it", "https://sito.it/",
    )
    body = msg.get_content()
    assert msg["To"] == "m@x.it" and "https://sito.it/annulla/abc" in body and "01/01/2099" in body
