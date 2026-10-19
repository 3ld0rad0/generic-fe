ADMIN_PASSWORD ?= admin
PORT ?= 3000
VENV := server/.venv

.PHONY: help install dev server client test lint build clean

help:
	@echo "make install  - installa dipendenze server (venv) e client"
	@echo "make dev      - avvia server (:$(PORT)) e client (:5173) insieme"
	@echo "make server   - avvia solo l'API FastAPI con reload"
	@echo "make client   - avvia solo il dev server Vite"
	@echo "make test     - esegue i test del server"
	@echo "make lint     - lint del client"
	@echo "make build    - build di produzione del client"
	@echo "make clean    - rimuove venv, node_modules e dist"
	@echo "Variabili: ADMIN_PASSWORD=$(ADMIN_PASSWORD) PORT=$(PORT)"

install: $(VENV)/.installed client/node_modules/.installed

$(VENV)/.installed: server/requirements.txt server/requirements-dev.txt
	test -d $(VENV) || python3 -m venv $(VENV)
	$(VENV)/bin/pip install -q -r server/requirements-dev.txt
	touch $@

client/node_modules/.installed: client/package.json client/package-lock.json
	cd client && npm install --no-audit --no-fund
	touch $@

dev: install
	$(MAKE) -j2 --no-print-directory server client

server: $(VENV)/.installed
	cd server && ADMIN_PASSWORD=$(ADMIN_PASSWORD) .venv/bin/uvicorn app.main:create_default_app --factory --reload --port $(PORT)

client: client/node_modules/.installed
	cd client && npm run dev

test: $(VENV)/.installed
	cd server && .venv/bin/pytest -q

lint: client/node_modules/.installed
	cd client && npm run lint

build: client/node_modules/.installed
	cd client && npm run build

clean:
	rm -rf $(VENV) client/node_modules client/dist
