import os
import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  UNIQUE (date, time)
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  players INTEGER NOT NULL CHECK (players > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
"""


def open_db(file=None):
    file = file or os.environ.get("DB_PATH", "./data/paintball.db")
    if file != ":memory:":
        os.makedirs(os.path.dirname(os.path.abspath(file)), exist_ok=True)
    # Autocommit: le transazioni sono gestite esplicitamente con BEGIN/COMMIT.
    db = sqlite3.connect(file, check_same_thread=False, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode = WAL")
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(SCHEMA)
    return db
