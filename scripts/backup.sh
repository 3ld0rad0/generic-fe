#!/usr/bin/env bash
# Backup a caldo del DB SQLite. Esempio cron (ogni notte alle 3):
#   0 3 * * * /percorso/generic-fe/scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
docker compose exec -T app python -c "
import sqlite3
src = sqlite3.connect('/data/paintball.db')
dst = sqlite3.connect('/data/backup.tmp')
src.backup(dst)
dst.close()
"
mv data/backup.tmp "backups/paintball-$(date +%F).db"
find backups -name 'paintball-*.db' -mtime +14 -delete
