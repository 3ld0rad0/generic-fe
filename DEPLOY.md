# Checklist di deploy

## 1. Prima di iniziare
- [ ] Dominio registrato, intestato all'attività, con rinnovo automatico e blocco del trasferimento.
- [ ] VPS in Europa con Ubuntu LTS, 2 vCPU e 2 GB di RAM.
- [ ] Completati i segnaposto in `client/src/pages/Legal.jsx`: ragione sociale, P. IVA, periodo di conservazione, hosting, annullamenti, maltempo e requisiti di età.
- [ ] In `client/index.html` aggiornati `og:image` e JSON-LD al dominio reale.
- [ ] Controllato `client/public/robots.txt`; aggiunta una sitemap se serve.
- [ ] Decisa la gestione delle prenotazioni false (conferma via email o simile).
- [ ] Test, lint e build in locale: `make test`, `make lint`, `make build`.

## 2. DNS
- [ ] Record `A` per `tuodominio.it` verso l'IP della VPS.
- [ ] Record `A` o `CNAME` per `www`.
- [ ] Propagazione verificata prima dell'avvio, per esempio con `dig tuodominio.it`.
- [ ] Record SPF, DKIM e DMARC per la posta, se usi `info@tuodominio.it`.

## 3. Sicurezza della VPS
- [ ] Utente non root con `sudo`.
- [ ] Accesso SSH solo con chiave: `PasswordAuthentication no` e login root disabilitato.
- [ ] Firewall attivo con solo le porte 22, 80 e 443 aperte.
- [ ] Aggiornamenti di sicurezza automatici (`unattended-upgrades`).
- [ ] Docker installato dai repository ufficiali.
- [ ] Fuso orario e orologio sincronizzati (NTP), perché i turni dipendono dall'ora.

## 4. Deploy
```bash
git clone <repo> generic-fe && cd generic-fe
make init-env              # genera password e segreto casuali, .env con permessi 0600
nano .env                  # imposta DOMAIN=tuodominio.it (le credenziali non vanno modificate)
chmod 700 data             # directory del database
docker compose up -d --build
```
- [ ] `.env` presente, non versionato e leggibile solo dal tuo utente.
- [ ] La password admin è salvata in un password manager (il valore `ADMIN_PASSWORD`).
- [ ] `docker compose ps` mostra `app` e `caddy` in esecuzione.
- [ ] Un solo container `app`, un solo processo Uvicorn.
- [ ] `docker compose logs caddy` mostra il certificato ottenuto senza errori.

## 5. Verifiche dopo la pubblicazione
- [ ] `https://tuodominio.it` si apre con certificato valido; `http://` reindirizza a HTTPS.
- [ ] Header verificati: `curl -sI https://tuodominio.it` mostra CSP, HSTS, `X-Frame-Options` e `nosniff`.
- [ ] `curl -sI https://tuodominio.it/api/slots` mostra `Cache-Control: no-store`.
- [ ] `/docs` e `/openapi.json` rispondono 404.
- [ ] Home, `/prenota`, `/privacy`, `/cookie` e `/termini` si caricano su desktop e mobile, senza errori nella console.
- [ ] Login admin, creazione sessione dal calendario, prenotazione di prova, annullamento e logout.
- [ ] La porta 3000 non è raggiungibile dall'esterno: `curl http://IP_VPS:3000` deve fallire.
- [ ] Test TLS (per esempio SSL Labs) per controllare la configurazione.

## 6. Dati e backup
- [ ] Prima del lancio svuotati i dati di prova (con `make reset-db` in locale, mai su dati reali in produzione).
- [ ] `scripts/backup.sh` in cron, per esempio ogni notte alle 3: `0 3 * * * /percorso/generic-fe/scripts/backup.sh`.
- [ ] Permessi restrittivi su `backups/` (`chmod 700 backups`).
- [ ] Copia dei backup fuori dalla VPS (storage esterno o snapshot del provider).
- [ ] Ripristino provato su un'altra macchina o directory.
- [ ] Politica di conservazione definita e coerente con l'informativa privacy.

## 7. Monitoraggio e manutenzione
- [ ] Controllo di disponibilità (per esempio UptimeRobot) su `/` e `/api/slots`.
- [ ] Avviso per spazio disco e certificato in scadenza.
- [ ] Aggiornamento periodico: `git pull && docker compose up -d --build`.
- [ ] `pip-audit` e `npm audit` ogni mese e dopo ogni aggiornamento importante.
- [ ] Dopo ogni cambio di `ADMIN_PASSWORD` o `SESSION_SECRET`: `docker compose up -d --force-recreate app`.

## 8. Piano di rientro
- [ ] Ultimo backup noto e testato.
- [ ] Commit precedente stabile annotato per tornare indietro con `git checkout` e un nuovo `docker compose up -d --build`.
- [ ] Contatti del provider e del registrar a portata di mano.
