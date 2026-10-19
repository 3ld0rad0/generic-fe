import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createApp } from './app.js';

const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  console.error('ADMIN_PASSWORD non impostata');
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const app = createApp({
  db: openDb(),
  adminPassword,
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  staticDir: process.env.STATIC_DIR || path.resolve(here, '../../client/dist'),
});

const port = Number(process.env.PORT) || 3000;
app.set('trust proxy', 1);
app.listen(port, () => console.log(`Server in ascolto su :${port}`));
