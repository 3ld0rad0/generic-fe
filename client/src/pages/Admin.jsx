import { useCallback, useEffect, useState } from 'react'
import { api, euro, formatDate, getToken, setToken } from '../api.js'

function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    try {
      const { token } = await api('/admin/login', { method: 'POST', body: { password } })
      setToken(token)
      onLogin()
    } catch (err) {
      setError(err.message)
    }
  }
  return (
    <form onSubmit={submit} className="card form">
      <h2>Area gestore</h2>
      {error && <p className="err">{error}</p>}
      <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <button className="btn">Accedi</button>
    </form>
  )
}

function Dashboard({ onLogout }) {
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ date: '', time: '', capacity: 12, price: 25 })

  const load = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([api('/slots?from=1970-01-01'), api('/admin/bookings', { admin: true })])
      setSlots(s)
      setBookings(b)
    } catch (e) {
      setError(e.message)
      if (!getToken()) onLogout()
    }
  }, [onLogout])

  useEffect(() => {
    load()
  }, [load])

  const run = async (fn) => {
    setError('')
    try {
      await fn()
      await load()
    } catch (e) {
      setError(e.message)
      if (!getToken()) onLogout()
    }
  }

  const addSlot = (e) => {
    e.preventDefault()
    run(() =>
      api('/admin/slots', {
        method: 'POST',
        admin: true,
        body: {
          date: form.date,
          time: form.time,
          capacity: Number(form.capacity),
          priceCents: Math.round(Number(form.price) * 100),
        },
      })
    )
  }

  const del = (path, msg) => {
    if (confirm(msg)) run(() => api(path, { method: 'DELETE', admin: true }))
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <div className="row between">
        <h1>Area gestore</h1>
        <button className="btn ghost" onClick={() => { setToken(null); onLogout() }}>Esci</button>
      </div>
      {error && <p className="err">{error}</p>}

      <form onSubmit={addSlot} className="card form inline">
        <h3>Nuova sessione</h3>
        <label>Data<input type="date" required value={form.date} onChange={set('date')} /></label>
        <label>Ora<input type="time" required value={form.time} onChange={set('time')} /></label>
        <label>Posti<input type="number" min="1" required value={form.capacity} onChange={set('capacity')} /></label>
        <label>Prezzo €<input type="number" min="0" step="0.01" required value={form.price} onChange={set('price')} /></label>
        <button className="btn">Aggiungi</button>
      </form>

      <h2>Sessioni e prenotazioni</h2>
      {slots.length === 0 && <p>Nessuna sessione.</p>}
      {slots.map((s) => (
        <div key={s.id} className="card">
          <div className="row between">
            <strong>{formatDate(s.date)} · {s.time} — {s.capacity - s.available}/{s.capacity} posti · {euro(s.price_cents)}</strong>
            <button className="btn danger" onClick={() => del(`/admin/slots/${s.id}`, 'Eliminare la sessione e le sue prenotazioni?')}>Elimina sessione</button>
          </div>
          <ul>
            {bookings.filter((b) => b.slot_id === s.id).map((b) => (
              <li key={b.id} className="row between">
                <span>{b.name} ({b.players}) · {b.email} · {b.phone}</span>
                <button className="btn ghost" onClick={() => del(`/admin/bookings/${b.id}`, 'Cancellare la prenotazione?')}>Cancella</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

export default function Admin() {
  const [logged, setLogged] = useState(!!getToken())
  const logout = useCallback(() => setLogged(false), [])
  return logged ? <Dashboard onLogout={logout} /> : <Login onLogin={() => setLogged(true)} />
}
