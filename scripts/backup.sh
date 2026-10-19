#!/usr/bin/env bash
# Backup a caldo del DB SQLite. Esempio cron (ogni notte alle 3):
#   0 3 * * * /percorso/generic-fe/scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
docker compose exec -T app node -e "
const D=require('better-sqlite3');
new D('/data/paintball.db').backup('/data/backup.tmp').then(()=>process.exit(0));
"
mv data/backup.tmp "backups/paintball-$(date +%F).db"
find backups -name 'paintball-*.db' -mtime +14 -delete
