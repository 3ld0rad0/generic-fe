import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

async function setup() {
  const app = createApp({ db: openDb(':memory:'), adminPassword: 'pw', secret: 's' });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, url, body, token) => {
    const r = await fetch(base + url, {
      method,
      headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    });
    return { status: r.status, body: r.status === 204 ? null : await r.json() };
  };
  const { body } = await call('POST', '/api/admin/login', { password: 'pw' });
  return { call, token: body.token, close: () => server.close() };
}

const slot = { date: '2099-01-01', time: '10:00', capacity: 5, priceCents: 2500 };
const person = { name: 'Mario', email: 'm@x.it', phone: '123456' };

test('admin routes require auth and wrong password is rejected', async () => {
  const { call, close } = await setup();
  assert.equal((await call('POST', '/api/admin/slots', slot)).status, 401);
  assert.equal((await call('POST', '/api/admin/login', { password: 'x' })).status, 401);
  close();
});

test('booking respects capacity', async () => {
  const { call, token, close } = await setup();
  const { body: s } = await call('POST', '/api/admin/slots', slot, token);
  assert.equal((await call('POST', '/api/bookings', { slotId: s.id, players: 3, ...person })).status, 201);
  assert.equal((await call('POST', '/api/bookings', { slotId: s.id, players: 3, ...person })).status, 409);
  assert.equal((await call('POST', '/api/bookings', { slotId: s.id, players: 2, ...person })).status, 201);
  const { body: slots } = await call('GET', '/api/slots');
  assert.equal(slots[0].available, 0);
  close();
});

test('validation and duplicate slots', async () => {
  const { call, token, close } = await setup();
  assert.equal((await call('POST', '/api/admin/slots', { ...slot, time: '25:00' }, token)).status, 400);
  await call('POST', '/api/admin/slots', slot, token);
  assert.equal((await call('POST', '/api/admin/slots', slot, token)).status, 409);
  assert.equal((await call('POST', '/api/bookings', { slotId: 1, players: 0, ...person })).status, 400);
  close();
});

test('admin can delete booking', async () => {
  const { call, token, close } = await setup();
  const { body: s } = await call('POST', '/api/admin/slots', slot, token);
  const { body: b } = await call('POST', '/api/bookings', { slotId: s.id, players: 1, ...person });
  assert.equal((await call('DELETE', `/api/admin/bookings/${b.id}`, null, token)).status, 204);
  assert.equal((await call('GET', '/api/admin/bookings', null, token)).body.length, 0);
  close();
});
