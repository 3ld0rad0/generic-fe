import argparse
import random
from datetime import date, timedelta

from .db import ACTIVITIES, open_db

HOURS = ("09:00", "10:30", "12:00", "14:30", "16:00", "17:30", "19:00")
PRICES_CENTS = (1500, 2000, 2500, 3000, 3500)


def seed_slots(db, days=30, per_day=4, seed=None, start=None):
    """Inserisce turni casuali nei prossimi `days` giorni; ritorna il numero di turni creati."""
    rng = random.Random(seed)
    start = start or date.today()
    created = 0
    for offset in range(days):
        day = (start + timedelta(days=offset)).isoformat()
        for _ in range(rng.randint(0, per_day)):
            cur = db.execute(
                "INSERT OR IGNORE INTO slots (activity, date, time, price_cents) VALUES (?, ?, ?, ?)",
                (rng.choice(ACTIVITIES), day, rng.choice(HOURS), rng.choice(PRICES_CENTS)),
            )
            created += cur.rowcount
    return created


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Popola il DB con turni casuali")
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--per-day", type=int, default=4)
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()
    print(f"Turni creati: {seed_slots(open_db(), args.days, args.per_day, args.seed)}")
