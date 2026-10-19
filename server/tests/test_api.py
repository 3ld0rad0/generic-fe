import pytest
from fastapi.testclient import TestClient

from app.db import open_db
from app.main import create_app

SLOT = {"date": "2099-01-01", "time": "10:00", "capacity": 5, "priceCents": 2500}
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


def test_booking_respects_capacity(api):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    book = lambda n: api.post("/api/bookings", json={"slotId": s["id"], "players": n, **PERSON}).status_code
    assert book(3) == 201
    assert book(3) == 409
    assert book(2) == 201
    assert api.get("/api/slots").json()[0]["available"] == 0


def test_validation_and_duplicate_slots(api):
    assert api.post("/api/admin/slots", json={**SLOT, "time": "25:00"}, headers=api.admin).status_code == 400
    api.post("/api/admin/slots", json=SLOT, headers=api.admin)
    assert api.post("/api/admin/slots", json=SLOT, headers=api.admin).status_code == 409
    assert api.post("/api/bookings", json={"slotId": 1, "players": 0, **PERSON}).status_code == 400


def test_admin_can_delete_booking(api):
    s = api.post("/api/admin/slots", json=SLOT, headers=api.admin).json()
    b = api.post("/api/bookings", json={"slotId": s["id"], "players": 1, **PERSON}).json()
    assert api.delete(f"/api/admin/bookings/{b['id']}", headers=api.admin).status_code == 204
    assert api.get("/api/admin/bookings", headers=api.admin).json() == []
