# Cardinali Poligono

Sito di gestione per il poligono: vetrina, prenotazione sessioni (paintball, tiro con l'arco, carabina) con disponibilità e area gestore.

- `client/` — React + Vite
- `server/` — Python + FastAPI + SQLite (sqlite3)

## Sviluppo

```bash
cd server && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt   # una tantum
cd server && ADMIN_PASSWORD=admin .venv/bin/uvicorn app.main:create_default_app --factory --reload --port 3000   # API su :3000
cd client && npm run dev                         # UI su :5173 (proxy /api)
cd server && .venv/bin/pytest
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
