# Paintball Arena

Sito di gestione per un campo da paintball: vetrina, prenotazione sessioni con disponibilità e area gestore.

- `client/` — React + Vite
- `server/` — Node + Express + SQLite (better-sqlite3)

## Sviluppo

```bash
cd server && ADMIN_PASSWORD=admin npm run dev   # API su :3000
cd client && npm run dev                         # UI su :5173 (proxy /api)
cd server && npm test
```

## Deploy (VPS con Docker)

```bash
cp .env.example .env    # imposta DOMAIN, ADMIN_PASSWORD, SESSION_SECRET
docker compose up -d --build
```

Caddy gestisce HTTPS automaticamente per `DOMAIN` (il DNS deve puntare alla VPS).
Aggiornare: `git pull && docker compose up -d --build`.

Il database è in `./data/paintball.db`. Backup: `scripts/backup.sh` (da mettere in cron) crea copie in `backups/`.
Esegui un solo container `app`: SQLite scrive su file locale.

## Pagine

- `/` vetrina · `/prenota` prenotazione · `/admin` area gestore (password unica)
