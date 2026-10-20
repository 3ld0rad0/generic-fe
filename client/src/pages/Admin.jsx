import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ACTIVITIES, activityBySlug, api, euro, formatShortDate, getToken, setToken, toISO, todayISO } from '../api.js'
import { Button, Field, Icon, ThemeToggle } from '../ui.jsx'

const WEEKDAYS = [
  ['Lun', 1],
  ['Mar', 2],
  ['Mer', 3],
  ['Gio', 4],
  ['Ven', 5],
  ['Sab', 6],
  ['Dom', 0],
]
const MAX_DATES = 366
const EMPTY_SESSION = {
  activity: ACTIVITIES[0].slug,
  date: '',
  endDate: '',
  days: WEEKDAYS.map(([, d]) => d),
  time: '',
  capacity: '16',
  price: '25',
}
const activityName = (slug) => activityBySlug(slug)?.name ?? slug

function expandDates(start, end, days) {
  if (!end) return [start]
  const dates = []
  const d = new Date(`${start}T00:00:00`)
  for (; toISO(d) <= end && dates.length <= MAX_DATES; d.setDate(d.getDate() + 1)) {
    if (days.includes(d.getDay())) dates.push(toISO(d))
  }
  return dates
}

function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!password) return setError('Inserisci la password')
    setSubmitting(true)
    try {
      const { token } = await api('/admin/login', { method: 'POST', body: { password } })
      setToken(token)
      onLogin()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <main className="manager-login">
      <Link className="back-home" to="/">
        ← Torna al sito
      </Link>
      <ThemeToggle className="floating" />
      <form onSubmit={submit} className="login-card" noValidate>
        <span className="manager-mark">
          <Icon name="gear" size={30} />
        </span>
        <span className="eyebrow">Area riservata</span>
        <h1>Accesso gestore</h1>
        <p>Inserisci la password per gestire prenotazioni e sessioni.</p>
        <Field
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          error={error}
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
          }}
        />
        <Button type="submit" icon="arrow" disabled={submitting}>
          {submitting ? 'Accesso...' : 'Accedi'}
        </Button>
        <small>Accesso riservato allo staff di Cardinali Poligono</small>
      </form>
    </main>
  )
}

function Dashboard({ onLogout }) {
  const [tab, setTab] = useState('bookings')
  const [bookings, setBookings] = useState(null)
  const [slots, setSlots] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [activityFilter, setActivityFilter] = useState('')
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION)
  const [saving, setSaving] = useState(false)
  const [today] = useState(todayISO)
  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
  )

  const handleError = useCallback(
    (e) => {
      if (e.status === 401) {
        setToken(null)
        onLogout()
      } else setError(e.message)
    },
    [onLogout],
  )

  const load = useCallback(
    () =>
      Promise.all([api('/slots?from=1970-01-01'), api('/admin/bookings', { admin: true })]).then(([s, b]) => {
        setSlots(s)
        setBookings(b)
      }, handleError),
    [handleError],
  )

  useEffect(() => {
    load()
  }, [load])

  const run = async (fn) => {
    setError('')
    try {
      await fn()
      await load()
      return true
    } catch (e) {
      handleError(e)
      return false
    }
  }

  const addSession = async (e) => {
    e.preventDefault()
    const { activity, date, endDate, days, time, capacity, price } = sessionForm
    if (!date || !time) return setError('Inserisci data e ora della sessione')
    if (endDate && endDate < date) return setError('La data di fine precede quella di inizio')
    const dates = expandDates(date, endDate, days)
    if (!dates.length) return setError('Nessun giorno selezionato nel periodo')
    if (dates.length > MAX_DATES) return setError(`Massimo ${MAX_DATES} sessioni alla volta`)
    setSaving(true)
    setNotice('')
    let result
    const ok = await run(async () => {
      result = await api('/admin/slots/bulk', {
        method: 'POST',
        admin: true,
        body: { activity, dates, time, capacity: Number(capacity), priceCents: Math.round(Number(price) * 100) },
      })
    })
    setSaving(false)
    if (!ok) return
    const { created, skipped } = result
    setNotice(
      `${created} ${created === 1 ? 'sessione creata' : 'sessioni create'}` +
        (skipped ? `, ${skipped} già ${skipped === 1 ? 'esistente' : 'esistenti'}` : ''),
    )
    setSessionForm({ ...sessionForm, date: '', endDate: '', time: '' })
  }

  const remove = (path, message) => {
    if (window.confirm(message)) run(() => api(path, { method: 'DELETE', admin: true }))
  }

  const setField = (key) => (e) => setSessionForm({ ...sessionForm, [key]: e.target.value })
  const toggleDay = (day) =>
    setSessionForm({
      ...sessionForm,
      days: sessionForm.days.includes(day) ? sessionForm.days.filter((d) => d !== day) : [...sessionForm.days, day],
    })

  const loading = bookings === null || slots === null
  const q = query.trim().toLowerCase()
  const visibleBookings = (bookings ?? []).filter(
    (b) =>
      (!activityFilter || b.activity === activityFilter) &&
      (!q || b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q)),
  )
  const visibleSlots = (slots ?? []).filter((s) => !activityFilter || s.activity === activityFilter)
  const upcoming = (bookings ?? []).filter((b) => b.date >= today)

  return (
    <main className="dashboard">
      <header className="dashboard-head">
        <div>
          <span className="manager-mark">
            <Icon name="target" size={25} />
          </span>
          <div>
            <strong>
              CARDINALI <b>POLIGONO</b>
            </strong>
            <small>Area gestore</small>
          </div>
        </div>
        <div className="head-actions">
          <ThemeToggle />
          <Button
            variant="ghost"
            onClick={() => {
              setToken(null)
              onLogout()
            }}
          >
            Esci
          </Button>
        </div>
      </header>
      <div className="dashboard-shell">
        <div className="dashboard-title">
          <div>
            <span className="eyebrow">Area gestore</span>
            <h1>Dashboard</h1>
            <p>Gestisci le prenotazioni e la disponibilità dei turni.</p>
          </div>
          <div className="today">
            <Icon name="calendar" />
            <span>
              <small>Oggi</small>
              {todayLabel}
            </span>
          </div>
        </div>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <div className="dashboard-stats">
          <div>
            <span>Prenotazioni oggi</span>
            <strong>{loading ? '–' : bookings.filter((b) => b.date === today).length}</strong>
          </div>
          <div>
            <span>Partecipanti attesi</span>
            <strong>{loading ? '–' : upcoming.reduce((sum, b) => sum + b.players, 0)}</strong>
          </div>
          <div>
            <span>Sessioni attive</span>
            <strong>{loading ? '–' : slots.filter((s) => s.date >= today).length}</strong>
          </div>
        </div>
        <div className="activity-picker filter" role="group" aria-label="Filtra per attività">
          {[{ slug: '', name: 'Tutte', icon: 'calendar' }, ...ACTIVITIES].map((a) => (
            <button
              type="button"
              key={a.slug}
              className={a.slug === activityFilter ? 'selected' : ''}
              aria-pressed={a.slug === activityFilter}
              onClick={() => setActivityFilter(a.slug)}
            >
              <Icon name={a.icon} size={20} />
              {a.name}
            </button>
          ))}
        </div>
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'bookings'}
            className={tab === 'bookings' ? 'active' : ''}
            onClick={() => setTab('bookings')}
          >
            Prenotazioni <span>{bookings?.length ?? 0}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'sessions'}
            className={tab === 'sessions' ? 'active' : ''}
            onClick={() => setTab('sessions')}
          >
            Sessioni <span>{slots?.length ?? 0}</span>
          </button>
        </div>

        {tab === 'bookings' && (
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Prenotazioni</h2>
                <p>Tutte le prenotazioni confermate.</p>
              </div>
              <label className="search">
                <span aria-hidden="true">⌕</span>
                <input
                  placeholder="Cerca per nome o email"
                  aria-label="Cerca per nome o email"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            {loading ? (
              <div className="state-card">
                <span className="spinner" />
                <h4>Caricamento...</h4>
              </div>
            ) : visibleBookings.length === 0 ? (
              <div className="admin-empty">
                <Icon name="calendar" size={34} />
                <h3>{bookings.length ? 'Nessun risultato' : 'Nessuna prenotazione'}</h3>
                <p>{bookings.length ? 'Nessuna prenotazione corrisponde alla ricerca.' : 'Le nuove prenotazioni appariranno qui.'}</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Ora</th>
                      <th>Attività</th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Telefono</th>
                      <th>Partecipanti</th>
                      <th>
                        <span className="sr-only">Azioni</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <strong>{formatShortDate(booking.date)}</strong>
                        </td>
                        <td>{booking.time}</td>
                        <td>
                          <span className="activity-badge">{activityName(booking.activity)}</span>
                        </td>
                        <td>{booking.name}</td>
                        <td>{booking.email}</td>
                        <td>{booking.phone}</td>
                        <td>
                          <span className="players-pill">
                            <Icon name="users" size={15} /> {booking.players}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="delete"
                            aria-label={`Elimina prenotazione di ${booking.name}`}
                            onClick={() =>
                              remove(`/admin/bookings/${booking.id}`, `Cancellare la prenotazione di ${booking.name}?`)
                            }
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'sessions' && (
          <section className="sessions-layout">
            <form className="session-form admin-panel" onSubmit={addSession}>
              <div>
                <h2>Aggiungi sessione</h2>
                <p>Crea uno o più turni con stesso orario, capienza e prezzo.</p>
              </div>
              <label className="field">
                <span>Attività</span>
                <select value={sessionForm.activity} onChange={setField('activity')}>
                  {ACTIVITIES.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Data" type="date" required min={today} value={sessionForm.date} onChange={setField('date')} />
              <Field
                label="Fino al (opzionale)"
                type="date"
                min={sessionForm.date || today}
                value={sessionForm.endDate}
                onChange={setField('endDate')}
              />
              {sessionForm.endDate && (
                <div className="weekday-picker" role="group" aria-label="Giorni della settimana">
                  {WEEKDAYS.map(([label, day]) => (
                    <button
                      type="button"
                      key={day}
                      className={sessionForm.days.includes(day) ? 'selected' : ''}
                      aria-pressed={sessionForm.days.includes(day)}
                      onClick={() => toggleDay(day)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <Field label="Ora" type="time" required value={sessionForm.time} onChange={setField('time')} />
              <div className="two-fields">
                <Field
                  label="Capienza"
                  type="number"
                  required
                  min="1"
                  max="500"
                  value={sessionForm.capacity}
                  onChange={setField('capacity')}
                />
                <Field
                  label="Prezzo (€)"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={sessionForm.price}
                  onChange={setField('price')}
                />
              </div>
              <Button type="submit" icon="plus" disabled={saving}>
                Aggiungi turni
              </Button>
            </form>
            <div className="admin-panel session-list">
              <div>
                <h2>Sessioni</h2>
                <p>Tutti i turni creati, con i posti già prenotati.</p>
              </div>
              {loading ? (
                <div className="state-card">
                  <span className="spinner" />
                  <h4>Caricamento...</h4>
                </div>
              ) : visibleSlots.length === 0 ? (
                <div className="admin-empty">
                  <Icon name="calendar" size={34} />
                  <h3>Nessuna sessione</h3>
                  <p>Crea il primo turno con il modulo qui accanto.</p>
                </div>
              ) : (
                visibleSlots.map((session) => (
                  <article key={session.id}>
                    <div className="session-date">
                      <Icon name="calendar" />
                      <span>
                        <strong>{formatShortDate(session.date)}</strong>
                        <small>
                          {session.time} · {activityName(session.activity)}
                        </small>
                      </span>
                    </div>
                    <div>
                      <span>Prenotati</span>
                      <strong>
                        {session.capacity - session.available}/{session.capacity} posti
                      </strong>
                    </div>
                    <div>
                      <span>Prezzo</span>
                      <strong>{euro(session.price_cents)}</strong>
                    </div>
                    <button
                      type="button"
                      className="delete"
                      aria-label={`Elimina sessione ${activityName(session.activity)} del ${formatShortDate(session.date)} alle ${session.time}`}
                      onClick={() =>
                        remove(
                          `/admin/slots/${session.id}`,
                          'Eliminare la sessione? Verranno cancellate anche tutte le sue prenotazioni.',
                        )
                      }
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default function Admin() {
  const [logged, setLogged] = useState(() => !!getToken())
  const logout = useCallback(() => setLogged(false), [])
  return logged ? <Dashboard onLogout={logout} /> : <Login onLogin={() => setLogged(true)} />
}
