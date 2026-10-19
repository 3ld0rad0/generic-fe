import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createAuth } from './auth.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isPosInt = (n) => Number.isInteger(n) && n > 0;
const bad = (res, msg) => res.status(400).json({ error: msg });

const SLOT_WITH_AVAILABILITY = `
  SELECT s.id, s.date, s.time, s.capacity, s.price_cents,
         s.capacity - COALESCE(SUM(b.players), 0) AS available
  FROM slots s LEFT JOIN bookings b ON b.slot_id = s.id
`;

export function createApp({ db, adminPassword, secret, staticDir }) {
  const app = express();
  const auth = createAuth({ password: adminPassword, secret });
  app.use(express.json({ limit: '10kb' }));

  const failures = new Map();
  const loginLimiter = (req, res, next) => {
    const entry = failures.get(req.ip);
    if (entry && entry.until > Date.now() && entry.count >= 5) {
      return res.status(429).json({ error: 'Troppi tentativi, riprova tra poco' });
    }
    next();
  };

  app.post('/api/admin/login', loginLimiter, (req, res) => {
    const token = auth.login(req.body?.password);
    if (!token) {
      const prev = failures.get(req.ip);
      const count = prev && prev.until > Date.now() ? prev.count + 1 : 1;
      failures.set(req.ip, { count, until: Date.now() + 5 * 60 * 1000 });
      return res.status(401).json({ error: 'Password errata' });
    }
    failures.delete(req.ip);
    res.json({ token });
  });

  // Pubblico: slot futuri con disponibilità
  app.get('/api/slots', (req, res) => {
    const from = DATE_RE.test(req.query.from) ? req.query.from : new Date().toISOString().slice(0, 10);
    const rows = db
      .prepare(`${SLOT_WITH_AVAILABILITY} WHERE s.date >= ? GROUP BY s.id ORDER BY s.date, s.time`)
      .all(from);
    res.json(rows);
  });

  // La transazione serializza il controllo della capienza e l'inserimento.
  const book = db.transaction((slotId, data) => {
    const slot = db
      .prepare(`${SLOT_WITH_AVAILABILITY} WHERE s.id = ? GROUP BY s.id`)
      .get(slotId);
    if (!slot) return { status: 404, error: 'Sessione non trovata' };
    if (slot.available < data.players) {
      return { status: 409, error: `Posti insufficienti (disponibili: ${slot.available})` };
    }
    const info = db
      .prepare('INSERT INTO bookings (slot_id, name, email, phone, players) VALUES (?, ?, ?, ?, ?)')
      .run(slotId, data.name, data.email, data.phone, data.players);
    return { status: 201, id: info.lastInsertRowid };
  });

  app.post('/api/bookings', (req, res) => {
    const { slotId, name, email, phone, players } = req.body ?? {};
    if (!isPosInt(slotId)) return bad(res, 'Sessione non valida');
    if (typeof name !== 'string' || !name.trim() || name.length > 100) return bad(res, 'Nome non valido');
    if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 200) return bad(res, 'Email non valida');
    if (typeof phone !== 'string' || phone.trim().length < 5 || phone.length > 30) return bad(res, 'Telefono non valido');
    if (!isPosInt(players) || players > 100) return bad(res, 'Numero giocatori non valido');

    const today = new Date().toISOString().slice(0, 10);
    const slot = db.prepare('SELECT date FROM slots WHERE id = ?').get(slotId);
    if (slot && slot.date < today) return bad(res, 'Sessione già passata');

    const result = book(slotId, { name: name.trim(), email: email.trim(), phone: phone.trim(), players });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(201).json({ id: result.id });
  });

  app.get('/api/admin/bookings', auth.requireAdmin, (req, res) => {
    const rows = db
      .prepare(
        `SELECT b.id, b.name, b.email, b.phone, b.players, b.created_at,
                s.id AS slot_id, s.date, s.time
         FROM bookings b JOIN slots s ON s.id = b.slot_id
         ORDER BY s.date, s.time, b.id`
      )
      .all();
    res.json(rows);
  });

  app.delete('/api/admin/bookings/:id', auth.requireAdmin, (req, res) => {
    const info = db.prepare('DELETE FROM bookings WHERE id = ?').run(Number(req.params.id));
    if (!info.changes) return res.status(404).json({ error: 'Prenotazione non trovata' });
    res.status(204).end();
  });

  app.post('/api/admin/slots', auth.requireAdmin, (req, res) => {
    const { date, time, capacity, priceCents } = req.body ?? {};
    if (!DATE_RE.test(date)) return bad(res, 'Data non valida');
    if (!TIME_RE.test(time)) return bad(res, 'Ora non valida');
    if (!isPosInt(capacity) || capacity > 500) return bad(res, 'Capienza non valida');
    if (!Number.isInteger(priceCents) || priceCents < 0) return bad(res, 'Prezzo non valido');
    try {
      const info = db
        .prepare('INSERT INTO slots (date, time, capacity, price_cents) VALUES (?, ?, ?, ?)')
        .run(date, time, capacity, priceCents);
      res.status(201).json({ id: info.lastInsertRowid });
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Sessione già esistente' });
      throw e;
    }
  });

  app.delete('/api/admin/slots/:id', auth.requireAdmin, (req, res) => {
    const info = db.prepare('DELETE FROM slots WHERE id = ?').run(Number(req.params.id));
    if (!info.changes) return res.status(404).json({ error: 'Sessione non trovata' });
    res.status(204).end();
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.use((req, res, next) =>
      req.method === 'GET' ? res.sendFile(path.resolve(staticDir, 'index.html')) : next()
    );
  }

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Errore interno' });
  });

  return app;
}
