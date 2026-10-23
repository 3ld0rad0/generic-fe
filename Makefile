PORT ?= 3000
VENV := server/.venv

DAYS ?= 30
PER_DAY ?= 4

.PHONY: help init-env install dev server client test seed reset-db lint build clean

help:
	@echo "make install  - installa dipendenze server (venv) e client"
	@echo "make init-env - genera .env con credenziali casuali senza sovrascrivere file esistenti"
	@echo "make dev      - avvia server (:$(PORT)) e client (:5173) insieme"
	@echo "make server   - avvia solo l'API FastAPI con reload"
	@echo "make client   - avvia solo il dev server Vite"
	@echo "make test     - esegue i test del server"
	@echo "make seed     - popola il DB con turni casuali (DAYS=$(DAYS) PER_DAY=$(PER_DAY))"
	@echo "make reset-db - svuota le tabelle slots e bookings"
	@echo "make lint     - lint del client"
	@echo "make build    - build di produzione del client"
	@echo "make clean    - rimuove venv, node_modules e dist"
	@echo "Variabili: PORT=$(PORT)"

init-env:
	@python3 -c 'import os, secrets; config = "DOMAIN=localhost\nADMIN_PASSWORD=" + secrets.token_hex(32) + "\nSESSION_SECRET=" + secrets.token_hex(32) + "\nAPP_TZ=Europe/Rome\n"; descriptor = os.open(".env", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600); stream = os.fdopen(descriptor, "w"); stream.write(config); stream.close()'
	@echo ".env creato con permessi 0600. Le credenziali non vengono mostrate."

install: $(VENV)/.installed client/node_modules/.installed

$(VENV)/.installed: Makefile server/requirements.txt server/requirements-dev.txt
	test -d $(VENV) || python3 -m venv $(VENV)
	$(VENV)/bin/python -m pip install --upgrade --only-binary=:all: "pip>=26.2.0"
	$(VENV)/bin/python -m pip install -q -r server/requirements-dev.txt
	touch $@

client/node_modules/.installed: client/package.json client/package-lock.json
	cd client && npm install --no-audit --no-fund
	touch $@

dev: install
	$(MAKE) -j2 --no-print-directory server client

server: $(VENV)/.installed
	@cd server && .venv/bin/uvicorn app.main:create_default_app --factory --env-file ../.env --reload --port $(PORT)

client: client/node_modules/.installed
	cd client && npm run dev

test: $(VENV)/.installed
	cd server && .venv/bin/pytest -q

seed: $(VENV)/.installed
	cd server && .venv/bin/python -m app.seed --days $(DAYS) --per-day $(PER_DAY)

reset-db: $(VENV)/.installed
	cd server && .venv/bin/python -c "from app.db import open_db; db = open_db(); db.executescript(\"DELETE FROM bookings; DELETE FROM slots; DELETE FROM sqlite_sequence WHERE name IN ('bookings', 'slots');\")"

lint: client/node_modules/.installed
	cd client && npm run lint

build: client/node_modules/.installed
	cd client && npm run build

clean:
	rm -rf $(VENV) client/node_modules client/dist
