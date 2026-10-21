import os
import sqlite3

ACTIVITIES = ("paintball", "arco", "carabina")
_ACTIVITIES_SQL = ", ".join(f"'{a}'" for a in ACTIVITIES)

SCHEMA = f"""
CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity TEXT NOT NULL DEFAULT 'paintball' CHECK (activity IN ({_ACTIVITIES_SQL})),
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  UNIQUE (activity, date, time)
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  players INTEGER NOT NULL CHECK (players > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cancel_token TEXT
);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_cancel_token ON bookings(cancel_token);
"""


def _migrate_slots(db):
    cols = [r["name"] for r in db.execute("PRAGMA table_info(slots)")]
    if not cols or ("activity" in cols and "capacity" not in cols):
        return
    activity = "activity" if "activity" in cols else "'paintball'"
    # Ricostruzione della tabella (UNIQUE non modificabile); FK off per non cancellare le prenotazioni.
    db.execute("PRAGMA foreign_keys = OFF")
    try:
        db.executescript(
            f"""
            BEGIN;
            CREATE TABLE slots_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              activity TEXT NOT NULL DEFAULT 'paintball' CHECK (activity IN ({_ACTIVITIES_SQL})),
              date TEXT NOT NULL,
              time TEXT NOT NULL,
              price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
              UNIQUE (activity, date, time)
            );
            INSERT INTO slots_new (id, activity, date, time, price_cents)
              SELECT id, {activity}, date, time, price_cents FROM slots;
            DROP TABLE slots;
            ALTER TABLE slots_new RENAME TO slots;
            COMMIT;
            """
        )
    finally:
        db.execute("PRAGMA foreign_keys = ON")


def _migrate_bookings(db):
    cols = [r["name"] for r in db.execute("PRAGMA table_info(bookings)")]
    if cols and "cancel_token" not in cols:
        db.execute("ALTER TABLE bookings ADD COLUMN cancel_token TEXT")


def open_db(file=None):
    file = file or os.environ.get("DB_PATH", "./data/paintball.db")
    if file != ":memory:":
        os.makedirs(os.path.dirname(os.path.abspath(file)), exist_ok=True)
    # Autocommit: le transazioni sono gestite esplicitamente con BEGIN/COMMIT.
    db = sqlite3.connect(file, check_same_thread=False, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode = WAL")
    db.execute("PRAGMA foreign_keys = ON")
    _migrate_slots(db)
    _migrate_bookings(db)
    db.executescript(SCHEMA)
    return db
