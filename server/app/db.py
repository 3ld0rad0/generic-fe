import os
import re
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
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
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


def normalize_phone(compact):
    """Formato internazionale: 00 diventa +, senza prefisso si assume un numero italiano."""
    if compact.startswith("00"):
        compact = "+" + compact[2:]
    return compact if compact.startswith("+") else "+39" + compact


def _migrate_phones(db):
    rows = db.execute("SELECT id, phone FROM bookings WHERE phone NOT LIKE '+%' OR phone GLOB '*[^+0-9]*'").fetchall()
    if rows:
        db.execute("BEGIN")
        db.executemany(
            "UPDATE bookings SET phone = ? WHERE id = ?",
            [(normalize_phone(re.sub(r"[^+0-9]", "", r["phone"])), r["id"]) for r in rows],
        )
        db.execute("COMMIT")


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
    db.executescript(SCHEMA)
    _migrate_phones(db)
    try:
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_slot ON bookings(slot_id)")
    except sqlite3.IntegrityError:
        pass  # DB legacy con più prenotazioni per slot: resta il controllo applicativo.
    return db
