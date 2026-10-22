import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ACTIVITIES, activityBySlug, api, euro, formatDate, formatShortDate, getToken, setToken, toISO, todayISO } from '../api.js'
import { downloadCsv } from '../csv.js'
import { gridKeys, usePageMeta } from '../helpers.js'
import { Button, Field, Icon } from '../ui.jsx'

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
const MODES = [
  ['single', 'Singola'],
  ['batch', 'Settimana'],
]
const PERIODS = [
  ['upcoming', 'Future'],
  ['past', 'Passate'],
  ['all', 'Tutte'],
]
const EMPTY_SESSION = {
  mode: 'single',
  activity: ACTIVITIES[0].slug,
  date: '',
  endDate: '',
  days: WEEKDAYS.map(([, d]) => d),
  time: '',
  price: '25',
}
const activityName = (slug) => activityBySlug(slug)?.name ?? slug
const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`

function AdminCalendar({ slots, bookingBySlot, today, month, onMonthChange, selected, onSelect, loading }) {
  const [year, m] = month
  const offset = (new Date(year, m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const label = new Date(year, m, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const byDate = {}
  for (const s of slots) {
    const d = (byDate[s.date] ||= { free: 0, booked: 0, closed: 0 })
    if (bookingBySlot[s.id]) d.booked += 1
    else if (s.bookable) d.free += 1
    else d.closed += 1
  }
  // Un solo giorno entra nell'ordine di tabulazione; le frecce spostano il fuoco tra gli altri.
  const tabStop = byDate[selected] ? selected : Object.keys(byDate).find((iso) => iso.startsWith(monthKey(year, m)))

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button type="button" aria-label="Mese precedente" onClick={() => onMonthChange(new Date(year, m - 1, 1))}>
          ‹
        </button>
        <h3>{label}</h3>
        <button type="button" aria-label="Mese successivo" onClick={() => onMonthChange(new Date(year, m + 1, 1))}>
          ›
        </button>
      </div>
      <div className="calendar-grid" aria-busy={loading} onKeyDown={gridKeys}>
        {WEEKDAYS.map(([name]) => (
          <span className="weekday" key={name}>
            {name}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const iso = toISO(new Date(year, m, i + 1))
          const d = byDate[iso]
          const state = !d
            ? ''
            : d.booked && d.free
              ? 'day-mixed'
              : d.booked
                ? 'day-booked'
                : d.free
                  ? 'day-available'
                  : 'day-closed'
          return (
            <button
              type="button"
              key={iso}
              disabled={!d}
              tabIndex={iso === tabStop ? 0 : -1}
              className={`${state} ${selected === iso ? 'selected' : ''} ${iso === today ? 'is-today' : ''}`}
              aria-pressed={selected === iso}
              aria-label={d ? `${formatDate(iso)}: ${d.free} libere, ${d.booked} prenotate` : formatDate(iso)}
              onClick={() => onSelect(iso)}
            >
              {i + 1}
              {d && (d.free > 0 || d.booked > 0) && (
                <span className="day-dots" aria-hidden="true">
                  {d.free > 0 && <i className="dot-free" />}
                  {d.booked > 0 && <i className="dot-booked" />}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i /> Libera
        </span>
        <span>
          <i className="dot-booked" /> Prenotata
        </span>
        <span>
          <i className="dot-closed" /> Chiusa o passata
        </span>
      </div>
    </div>
  )
}

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
  const [tab, setTab] = useState('today')
  const [bookings, setBookings] = useState(null)
  const [slots, setSlots] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [activityFilter, setActivityFilter] = useState('')
  const [bookingPeriod, setBookingPeriod] = useState('upcoming')
  const [slotPeriod, setSlotPeriod] = useState('upcoming')
  const [slotDate, setSlotDate] = useState('')
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION)
  const [saving, setSaving] = useState(false)
  const [today] = useState(todayISO)
  const [calMonth, setCalMonth] = useState(() => [Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1])
  const [calDate, setCalDate] = useState(today)
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

  // Lo storico (date passate) si scarica solo quando un filtro lo richiede.
  const needsHistory =
    bookingPeriod !== 'upcoming' ||
    slotPeriod !== 'upcoming' ||
    (!!slotDate && slotDate < today) ||
    (tab === 'calendar' && monthKey(calMonth[0], calMonth[1]) < today.slice(0, 7))
  const from = needsHistory ? '1970-01-01' : today

  const load = useCallback(
    (isCurrent = () => true) =>
      Promise.all([api(`/slots?from=${from}`), api(`/admin/bookings?from=${from}`, { admin: true })]).then(([s, b]) => {
        if (!isCurrent()) return
        setSlots(s)
        setBookings(b)
      }, handleError),
    [handleError, from],
  )

  useEffect(() => {
    let current = true
    load(() => current)
    return () => {
      current = false
    }
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
    const { mode, activity, date, endDate, days, time, price } = sessionForm
    const batch = mode === 'batch'
    const priceCents = Math.round(Number(price) * 100)
    if (!date || !time) return setError('Inserisci data e ora della sessione')
    if (batch && !endDate) return setError('Inserisci la data di fine del periodo')
    if (batch && endDate < date) return setError('La data di fine precede quella di inizio')
    const dates = batch ? expandDates(date, endDate, days) : [date]
    if (!dates.length) return setError('Nessun giorno selezionato nel periodo')
    if (dates.length > MAX_DATES) return setError(`Massimo ${MAX_DATES} sessioni alla volta`)
    setSaving(true)
    setNotice('')
    let result
    const ok = await run(async () => {
      result = batch
        ? await api('/admin/slots/bulk', { method: 'POST', admin: true, body: { activity, dates, time, priceCents } })
        : await api('/admin/slots', { method: 'POST', admin: true, body: { activity, date, time, priceCents } })
    })
    setSaving(false)
    if (!ok) return
    if (!batch) setNotice('Sessione creata')
    else {
      const { created, skipped } = result
      setNotice(
        `${created} ${created === 1 ? 'sessione creata' : 'sessioni create'}` +
          (skipped ? `, ${skipped} già ${skipped === 1 ? 'esistente' : 'esistenti'}` : ''),
      )
    }
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
  const inPeriod = (date, period) => period === 'all' || (period === 'upcoming' ? date >= today : date < today)
  const visibleBookings = (bookings ?? []).filter(
    (b) =>
      inPeriod(b.date, bookingPeriod) &&
      (!activityFilter || b.activity === activityFilter) &&
      (!q || b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q)),
  )
  const visibleSlots = (slots ?? []).filter(
    (s) =>
      (!activityFilter || s.activity === activityFilter) &&
      (slotDate ? s.date === slotDate : inPeriod(s.date, slotPeriod)),
  )
  const upcoming = (bookings ?? []).filter((b) => b.date >= today)
  const bookedBySlot = {}
  const bookingBySlot = {}
  for (const b of bookings ?? []) {
    const t = (bookedBySlot[b.slot_id] ||= { bookings: 0, players: 0 })
    t.bookings += 1
    t.players += b.players
    bookingBySlot[b.slot_id] = b
  }
  const calendarSlots = (slots ?? []).filter((s) => !activityFilter || s.activity === activityFilter)
  const daySlots = calendarSlots.filter((s) => s.date === calDate)
  const todaySlots = calendarSlots.filter((s) => s.date === today)
  const todayBooked = todaySlots.filter((s) => bookingBySlot[s.id])
  const todayPlayers = todayBooked.reduce((sum, s) => sum + bookingBySlot[s.id].players, 0)

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
            aria-selected={tab === 'today'}
            className={tab === 'today' ? 'active' : ''}
            onClick={() => setTab('today')}
          >
            Oggi
          </button>
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
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'calendar'}
            className={tab === 'calendar' ? 'active' : ''}
            onClick={() => setTab('calendar')}
          >
            Calendario
          </button>
        </div>

        {tab === 'today' && (
          <section className="admin-panel today-panel">
            <h1 className="print-only">Cardinali Poligono · programma di {formatDate(today)}</h1>
            <div className="admin-panel-head">
              <div>
                <h2>Programma di oggi</h2>
                <p>
                  {formatDate(today)}: {todaySlots.length} {todaySlots.length === 1 ? 'sessione' : 'sessioni'}, {todayBooked.length}{' '}
                  {todayBooked.length === 1 ? 'prenotata' : 'prenotate'}, {todayPlayers} partecipanti attesi.
                </p>
              </div>
              <Button className="btn-sm no-print" variant="ghost" disabled={todaySlots.length === 0} onClick={() => window.print()}>
                Stampa
              </Button>
            </div>
            {loading ? (
              <div className="state-card">
                <span className="spinner" />
                <h4>Caricamento...</h4>
              </div>
            ) : todaySlots.length === 0 ? (
              <div className="admin-empty">
                <Icon name="calendar" size={34} />
                <h3>Nessuna sessione oggi</h3>
                <p>Per oggi non ci sono turni in programma.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ora</th>
                      <th>Attività</th>
                      <th>Stato</th>
                      <th>Nome</th>
                      <th>Telefono</th>
                      <th>Partecipanti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaySlots.map((s) => {
                      const booking = bookingBySlot[s.id]
                      const status = booking ? 'booked' : s.bookable ? 'free' : 'closed'
                      return (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.time}</strong>
                          </td>
                          <td>{activityName(s.activity)}</td>
                          <td>
                            <span className={`status-pill ${status}`}>
                              {{ booked: 'Prenotata', free: 'Libera', closed: 'Chiusa' }[status]}
                            </span>
                          </td>
                          <td>{booking?.name ?? '—'}</td>
                          <td>{booking?.phone ?? '—'}</td>
                          <td>{booking ? booking.players : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'calendar' && (
          <section className="calendar-layout">
            <AdminCalendar
              slots={calendarSlots}
              bookingBySlot={bookingBySlot}
              today={today}
              month={calMonth}
              onMonthChange={(d) => setCalMonth([d.getFullYear(), d.getMonth()])}
              selected={calDate}
              onSelect={setCalDate}
              loading={loading}
            />
            <div className="admin-panel day-panel">
              <div>
                <h2>{calDate ? formatDate(calDate) : 'Dettaglio giorno'}</h2>
                <p>Sessioni del giorno selezionato e chi le ha prenotate.</p>
              </div>
              {loading ? (
                <div className="state-card">
                  <span className="spinner" />
                  <h4>Caricamento...</h4>
                </div>
              ) : daySlots.length === 0 ? (
                <div className="admin-empty">
                  <Icon name="calendar" size={34} />
                  <h3>Nessuna sessione</h3>
                  <p>Scegli un giorno evidenziato nel calendario.</p>
                </div>
              ) : (
                <div className="day-sessions">
                  {daySlots.map((s) => {
                    const booking = bookingBySlot[s.id]
                    const status = booking ? 'booked' : s.bookable ? 'free' : 'closed'
                    return (
                      <article key={s.id}>
                        <div className="day-time">
                          <strong>{s.time}</strong>
                          <small>{activityName(s.activity)}</small>
                        </div>
                        <div className="booking-info">
                          {booking ? (
                            <>
                              <strong>{booking.name}</strong>
                              <small>
                                {booking.phone} · {booking.players} {booking.players === 1 ? 'partecipante' : 'partecipanti'}
                              </small>
                            </>
                          ) : (
                            <small>{euro(s.price_cents)}</small>
                          )}
                        </div>
                        <span className={`status-pill ${status}`}>
                          {{ booked: 'Prenotata', free: 'Libera', closed: 'Chiusa' }[status]}
                        </span>
                        <div className="day-actions">
                          {booking && (
                            <button
                              type="button"
                              className="mini-btn danger"
                              onClick={() =>
                                remove(`/admin/bookings/${booking.id}`, `Annullare la prenotazione di ${booking.name}?`)
                              }
                            >
                              Annulla prenotazione
                            </button>
                          )}
                          <button
                            type="button"
                            className="mini-btn danger"
                            onClick={() =>
                              remove(
                                `/admin/slots/${s.id}`,
                                booking
                                  ? `Eliminare la sessione? Verrà cancellata anche la prenotazione di ${booking.name}.`
                                  : 'Eliminare la sessione?',
                              )
                            }
                          >
                            Elimina sessione
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {tab === 'bookings' && (
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Prenotazioni</h2>
                <p>Tutte le prenotazioni confermate.</p>
              </div>
              <div className="panel-tools">
                <label className="field">
                  <span className="sr-only">Mostra</span>
                  <select value={bookingPeriod} onChange={(e) => setBookingPeriod(e.target.value)}>
                    {PERIODS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    placeholder="Cerca per nome o email"
                    aria-label="Cerca per nome o email"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <Button
                  className="btn-sm"
                  variant="ghost"
                  disabled={visibleBookings.length === 0}
                  onClick={() => downloadCsv(visibleBookings, `prenotazioni-${bookingPeriod}`)}
                >
                  Esporta CSV
                </Button>
              </div>
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
                <p>Crea un singolo turno oppure un gruppo di turni con stesso orario e prezzo.</p>
              </div>
              <div className="activity-picker filter two" role="group" aria-label="Modalità di inserimento">
                {MODES.map(([mode, label]) => (
                  <button
                    type="button"
                    key={mode}
                    className={sessionForm.mode === mode ? 'selected' : ''}
                    aria-pressed={sessionForm.mode === mode}
                    onClick={() => setSessionForm({ ...sessionForm, mode })}
                  >
                    {label}
                  </button>
                ))}
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
              <Field
                label={sessionForm.mode === 'batch' ? 'Dal' : 'Data'}
                type="date"
                required
                min={today}
                value={sessionForm.date}
                onChange={setField('date')}
              />
              {sessionForm.mode === 'batch' && (
                <>
                  <Field
                    label="Al"
                    type="date"
                    required
                    min={sessionForm.date || today}
                    value={sessionForm.endDate}
                    onChange={setField('endDate')}
                  />
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
                </>
              )}
              <div className="two-fields">
                <Field label="Ora" type="time" required value={sessionForm.time} onChange={setField('time')} />
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
                <p>Tutti i turni creati, con le prenotazioni ricevute.</p>
              </div>
              <div className="session-filters">
                <label className="field">
                  <span>Mostra</span>
                  <select value={slotPeriod} disabled={!!slotDate} onChange={(e) => setSlotPeriod(e.target.value)}>
                    {PERIODS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Data" type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
              </div>
              <div className="session-scroll">
                {loading ? (
                  <div className="state-card">
                    <span className="spinner" />
                    <h4>Caricamento...</h4>
                  </div>
                ) : visibleSlots.length === 0 ? (
                  <div className="admin-empty">
                    <Icon name="calendar" size={34} />
                    <h3>Nessuna sessione</h3>
                    <p>Nessun turno corrisponde ai filtri. Crea un turno con il modulo qui accanto.</p>
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
                          {bookedBySlot[session.id]?.bookings ?? 0} · {bookedBySlot[session.id]?.players ?? 0} partecipanti
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
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default function Admin() {
  usePageMeta({ title: 'Area gestore', noindex: true })
  const [logged, setLogged] = useState(() => !!getToken())
  const logout = useCallback(() => setLogged(false), [])
  return logged ? <Dashboard onLogout={logout} /> : <Login onLogin={() => setLogged(true)} />
}
