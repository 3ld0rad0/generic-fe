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
    client = TestClient(create_app(open_db(":memory:"), "pw", "s"))
    token = client.post("/api/admin/login", json={"password": "pw"}).json()["token"]
    client.admin = {"authorization": f"Bearer {token}"}
    return client


def test_admin_routes_require_auth_and_wrong_password_is_rejected(api):
    assert api.post("/api/admin/slots", json=SLOT).status_code == 401
    assert api.post("/api/admin/login", json={"password": "x"}).status_code == 401


def test_slot_accepts_a_single_booking_until_it_is_freed(api):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    book = lambda **p: api.post("/api/bookings", json={"slotId": s["id"], "players": 40, **{**PERSON, **p}}).status_code
    assert api.get("/api/slots").json()[0].keys() == {"id", "activity", "date", "time", "price_cents", "bookable"}
    assert api.get("/api/slots").json()[0]["bookable"] is True
    assert book() == 201
    assert api.get("/api/slots").json()[0]["bookable"] is False
    assert book(email="altro@x.it", phone="999888777") == 409
    assert [b["players"] for b in api.get("/api/admin/bookings", headers=api.admin).json()] == [40]

    api.delete("/api/admin/bookings/1", headers=api.admin)
    assert api.get("/api/slots").json()[0]["bookable"] is True
    assert book(email="altro@x.it", phone="999888777") == 201


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
    assert db.execute("SELECT phone FROM bookings").fetchone()[0] == "+39123456"
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


def test_booking_closes_one_hour_before_the_slot(api, monkeypatch):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    book = lambda: api.post("/api/bookings", json={"slotId": s["id"], "players": 1, **PERSON}).status_code

    _at(monkeypatch, "09:01")
    assert api.get("/api/slots?from=2099-01-01").json()[0]["bookable"] is False
    assert book() == 400

    _at(monkeypatch, "09:00")
    assert api.get("/api/slots?from=2099-01-01").json()[0]["bookable"] is True
    assert book() == 201


def _booker(api, monkeypatch):
    monkeypatch.setattr(main, "BOOKING_IP_MAX", 100)
    bulk = {k: v for k, v in SLOT.items() if k != "date"}
    dates = [f"2099-01-{d:02d}" for d in range(1, 11)]
    api.post("/api/admin/slots/bulk", json={**bulk, "dates": dates}, headers=api.admin)
    free = iter(s["id"] for s in api.get("/api/slots").json())
    return lambda **p: api.post("/api/bookings", json={"slotId": next(free), "players": 1, **{**PERSON, **p}}).status_code


def test_active_bookings_per_email_are_limited_and_deleting_frees_a_place(api, monkeypatch):
    book = _booker(api, monkeypatch)
    assert [book(phone=f"33300{i}") for i in range(main.MAX_ACTIVE_PER_CONTACT)] == [201] * main.MAX_ACTIVE_PER_CONTACT
    assert book(email="M@X.IT", phone="111111") == 429

    api.delete("/api/admin/bookings/1", headers=api.admin)
    assert book(phone="777777") == 201


def test_active_bookings_per_phone_are_limited_ignoring_spaces(api, monkeypatch):
    book = _booker(api, monkeypatch)
    phones = ["333 000 111", "333000111", "3330 00111"]
    assert [book(email=f"p{i}@x.it", phone=ph) for i, ph in enumerate(phones)] == [201, 201, 201]
    assert book(email="new@x.it", phone="333000111") == 429
    assert book(email="new@x.it", phone="555000111") == 201


def test_bookings_per_ip_are_limited(api):
    bulk = {k: v for k, v in SLOT.items() if k != "date"}
    api.post("/api/admin/slots/bulk", json={**bulk, "dates": [f"2099-01-0{d}" for d in range(1, 6)]}, headers=api.admin)
    ids = [s["id"] for s in api.get("/api/slots").json()]
    for i in range(main.BOOKING_IP_MAX):
        r = api.post(
            "/api/bookings",
            json={"slotId": ids[i], "players": 1, "name": "Anna", "email": f"a{i}@x.it", "phone": f"55500{i}00"},
        )
        assert r.status_code == 201
    r = api.post("/api/bookings", json={"slotId": ids[-1], "players": 1, "name": "Anna", "email": "z@x.it", "phone": "5559999"})
    assert r.status_code == 429


@pytest.mark.parametrize(
    "field, value",
    [
        ("name", "A"),
        ("name", "   "),
        ("name", "=cmd|' /C calc'!A0"),
        ("name", "<script>alert(1)</script>"),
        ("name", "Mario123"),
        ("name", "Mario\nRossi\x00"),
        ("name", "M" * 101),
        ("name", 42),
        ("email", "mario"),
        ("email", "mario@x"),
        ("email", "mario@@x.it"),
        ("email", "ma rio@x.it"),
        ("email", "mario..r@x.it"),
        ("email", ".mario@x.it"),
        ("email", "mario@-x.it"),
        ("email", "mario@x.i"),
        ("email", "a" * 65 + "@x.it"),
        ("email", None),
        ("phone", "12345"),
        ("phone", "1" * 16),
        ("phone", "abc123456"),
        ("phone", "333+123456"),
        ("phone", "(333 123456"),
        ("phone", "333;DROP TABLE"),
        ("phone", 3331234567),
    ],
)
def test_invalid_contact_fields_are_rejected(api, field, value):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    r = api.post("/api/bookings", json={"slotId": s["id"], "players": 1, **{**PERSON, field: value}})
    assert r.status_code == 400


def test_contact_fields_are_normalized_before_saving(api):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    person = {"name": "  Jean-Luc   D’Angelo Jr. ", "email": " Mario.Rossi+test@Example.IT ", "phone": " +39 (333) 123-45.67 "}
    assert api.post("/api/bookings", json={"slotId": s["id"], "players": 1, **person}).status_code == 201
    saved = api.get("/api/admin/bookings", headers=api.admin).json()[0]
    assert (saved["name"], saved["email"], saved["phone"]) == ("Jean-Luc D’Angelo Jr.", "mario.rossi+test@example.it", "+393331234567")


def test_accented_names_are_accepted(api):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    r = api.post("/api/bookings", json={"slotId": s["id"], "players": 1, **{**PERSON, "name": "Niccolò Dell'Orò"}})
    assert r.status_code == 201


def test_names_with_combining_marks_are_stored_in_nfc(api):
    import unicodedata

    for k, name in enumerate((unicodedata.normalize("NFD", "Niccolò Citrò"), "देव शर्मा")):
        s = api.post("/api/admin/slots", json={**SLOT, "date": f"2099-03-0{k + 1}"}, headers=api.admin).json()
        assert api.post("/api/bookings", json={"slotId": s["id"], "players": 1, **{**PERSON, "name": name}}).status_code == 201
    names = [b["name"] for b in api.get("/api/admin/bookings", headers=api.admin).json()]
    assert "Niccolò Citrò" in names


def test_identical_retry_returns_the_existing_booking(api):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    body = {"slotId": s["id"], "players": 2, **PERSON}
    first = api.post("/api/bookings", json=body)
    retry = api.post("/api/bookings", json=body)
    assert (first.status_code, retry.status_code) == (201, 200) and retry.json() == first.json()
    assert api.post("/api/bookings", json={**body, "players": 3}).status_code == 409
    assert len(api.get("/api/admin/bookings", headers=api.admin).json()) == 1


def test_phone_prefixes_identify_the_same_contact(monkeypatch, api):
    monkeypatch.setattr(main, "BOOKING_IP_MAX", 100)
    bulk = {k: v for k, v in SLOT.items() if k != "date"}
    api.post("/api/admin/slots/bulk", json={**bulk, "dates": [f"2099-01-0{d}" for d in range(1, 5)]}, headers=api.admin)
    ids = [s["id"] for s in api.get("/api/slots").json()]
    phones = ["333 123 4567", "+39 3331234567", "0039 333 1234567", "(333) 1234567"]
    codes = [api.post("/api/bookings", json={"slotId": i, "players": 1, **PERSON, "email": f"p{i}@x.it", "phone": p}).status_code
             for i, p in zip(ids, phones)]
    assert codes == [201, 201, 201, 429]
    assert {b["phone"] for b in api.get("/api/admin/bookings", headers=api.admin).json()} == {"+393331234567"}


def test_impossible_dates_and_out_of_range_numbers_are_rejected(api):
    for bad in ({"date": "2099-02-29"}, {"date": "0000-01-01"}, {"priceCents": 2**63}, {"priceCents": main.MAX_PRICE_CENTS + 1}):
        assert api.post("/api/admin/slots", json={**SLOT, **bad}, headers=api.admin).status_code == 400
    assert api.post("/api/bookings", json={"slotId": 2**63, "players": 1, **PERSON}).status_code == 400
    assert api.delete(f"/api/admin/bookings/{2**63}", headers=api.admin).status_code == 404
    assert api.delete(f"/api/admin/slots/{-(2**64)}", headers=api.admin).status_code == 404
    assert api.get("/api/slots").status_code == 200


def test_admin_bookings_can_start_from_a_date(api):
    for date in ("2099-01-01", "2099-02-01"):
        s = api.post("/api/admin/slots", json={**SLOT, "date": date}, headers=api.admin).json()
        api.post("/api/bookings", json={"slotId": s["id"], "players": 1, **PERSON})
    assert [b["date"] for b in api.get("/api/admin/bookings?from=2099-01-15", headers=api.admin).json()] == ["2099-02-01"]
    assert api.get("/api/admin/bookings?from=2099-02-30", headers=api.admin).status_code == 400
