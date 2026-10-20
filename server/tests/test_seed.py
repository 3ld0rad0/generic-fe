from datetime import date

from fastapi.testclient import TestClient

from app.db import ACTIVITIES, open_db
from app.main import TIME_RE, create_app
from app.seed import seed_slots


def test_seed_creates_valid_random_slots_visible_from_api():
    db = open_db(":memory:")
    created = seed_slots(db, days=30, per_day=4, seed=1, start=date(2099, 1, 1))
    assert created > 0

    slots = TestClient(create_app(db, "pw", "s")).get("/api/slots").json()
    assert len(slots) == created
    assert all(s["activity"] in ACTIVITIES and TIME_RE.fullmatch(s["time"]) for s in slots)
    assert all("2099-01-01" <= s["date"] <= "2099-01-30" for s in slots)


def test_seed_is_reproducible_and_idempotent():
    a, b = open_db(":memory:"), open_db(":memory:")
    assert seed_slots(a, seed=42, start=date(2099, 1, 1)) == seed_slots(b, seed=42, start=date(2099, 1, 1))
    assert seed_slots(a, seed=42, start=date(2099, 1, 1)) == 0
