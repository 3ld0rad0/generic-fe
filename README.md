# Cardinali Poligono

Sito di gestione per il poligono: vetrina, prenotazione sessioni (paintball, tiro con l'arco, carabina) con disponibilità e area gestore.

- `client/` — React + Vite
- `server/` — Python + FastAPI + SQLite (sqlite3)

## Sviluppo

```bash
make install
make init-env
make dev
make test
```

`make init-env` crea `.env` con password e segreto casuali distinti, permessi `0600` e senza stamparli.
Non sovrascrive una configurazione esistente. La password per il login admin e' il valore `ADMIN_PASSWORD` in `.env`.
`make dev` carica la configurazione tramite dotenv: API su `:3000`, UI su `:5173`.
L'avvio rifiuta password mancanti, comuni o inferiori a 12 caratteri e segreti mancanti, di esempio o inferiori a 32 caratteri.
Per sostituire un segreto usa `openssl rand -hex 32`; non riutilizzare la password come segreto.

## Deploy (VPS con Docker)

```bash
make init-env           # solo se .env non esiste; poi imposta DOMAIN con il dominio reale
docker compose up -d --build
```

Caddy gestisce HTTPS automaticamente per `DOMAIN` (il DNS deve puntare alla VPS).
Aggiornare: `git pull && docker compose up -d --build`.

Il database è in `./data/paintball.db`. Backup: `scripts/backup.sh` (da mettere in cron) crea copie in `backups/`.
Esegui un solo container `app` con un solo processo Uvicorn: SQLite scrive su file locale e le sessioni admin sono in memoria.
I token casuali scadono dopo 12 ore e vengono revocati dal logout; ogni riavvio invalida tutte le sessioni.
Dopo una modifica a `ADMIN_PASSWORD` o `SESSION_SECRET`, ricrea il servizio con
`docker compose up -d --force-recreate app` (in sviluppo riavvia `make dev`).
Per usare piu' processi o repliche occorre prima spostare le sessioni in un archivio condiviso.

## Pagine

- `/` vetrina · `/prenota` prenotazione · `/admin` area gestore (password unica)
