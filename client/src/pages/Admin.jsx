import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ACTIVITIES, activityBySlug, api, euro, formatDate, formatShortDate, getToken, loadPackages, packageById, PACKAGES, setToken, toISO, todayISO } from '../api.js'
import { downloadCsv } from '../csv.js'
import { gridKeys, usePageMeta } from '../helpers.js'
import { Button, Field, Icon, Select, TimeField } from '../ui.jsx'

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
const ACTIVITY_OPTIONS = ACTIVITIES.map((a) => [a.slug, a.name])
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
const packageName = (id) => (id ? (packageById(id)?.name ?? id) : '—')
// Pacchetto con il prezzo a persona applicato al momento della prenotazione.
const bookingPackage = (b) =>
  b.package ? `${packageName(b.package)}${b.unit_price_cents == null ? '' : ` · ${euro(b.unit_price_cents)}`}` : '—'
const sessionLabel = (activity, date, time) => `${activityName(activity)} · ${formatShortDate(date)} · ${time}`
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
// Il paintball si paga a pacchetto: il prezzo del turno è solo un valore di servizio (il più basso).
const minPackageCents = () => Math.min(...PACKAGES.map((p) => p.priceCents))
const sessionPriceCents = (activity, price) =>
  activity === 'paintball' ? minPackageCents() : Math.round(Number(price) * 100)
const priceLabel = (s) => (s.activity === 'paintball' ? `da ${euro(minPackageCents())} / persona` : euro(s.price_cents))
const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`
const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
// Distanza minima tra sessioni della stessa attività: allineata a MIN_SLOT_GAP_MIN del server.
const MIN_GAP = 60

// Orari non selezionabili: già trascorsi oggi o troppo vicini a una sessione esistente.
// `clock` è l'ora del server (stessa del controllo lato server); senza, si usa quella del browser.
function blockedTimes(slots, clock, today, activity, date) {
  if (!date) return () => false
  const browser = new Date()
  const nowDate = clock?.date ?? today
  const nowMin = clock
    ? clock.minutes + Math.floor((Date.now() - clock.at) / 60000)
    : browser.getHours() * 60 + browser.getMinutes()
  const taken = (slots ?? []).filter((s) => s.activity === activity && s.date === date).map((s) => toMinutes(s.time))
  return (t) => {
    const min = toMinutes(t)
    return date < nowDate || (date === nowDate && min <= nowMin) || taken.some((x) => Math.abs(x - min) < MIN_GAP)
  }
}

function AdminCalendar({ slots, bookingBySlot, today, month, onMonthChange, selected, onSelect, loading }) {
  const [year, m] = month
  const offset = (new Date(year, m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const label = new Date(year, m, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const byDate = {}
  for (const s of slots) {
    const d = (byDate[s.date] ||= { free: 0, booked: 0, closed: 0, acts: new Set() })
    d.acts.add(s.activity)
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
              disabled={!d && iso < today}
              tabIndex={iso === tabStop ? 0 : -1}
              className={`${state} ${selected === iso ? 'selected' : ''} ${iso === today ? 'is-today' : ''}`}
              aria-pressed={selected === iso}
              aria-label={d ? `${formatDate(iso)}: ${d.free} libere, ${d.booked} prenotate` : formatDate(iso)}
              onClick={() => onSelect(iso)}
            >
              {i + 1}
              {d && (
                <span className="day-acts" aria-hidden="true">
                  {ACTIVITIES.filter((a) => d.acts.has(a.slug)).map((a) => (
                    <Icon key={a.slug} name={a.icon} size={11} />
                  ))}
                </span>
              )}
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

function ConfirmDialog({ message, busy, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel} onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <div
        className="modal-card confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="confirm-icon">
          <Icon name="trash" size={24} />
        </span>
        <h3 id="confirm-title">Conferma eliminazione</h3>
        <p id="confirm-message">{message}</p>
        <div className="modal-actions">
          <Button variant="ghost" autoFocus onClick={onCancel}>
            Annulla
          </Button>
          <Button variant="danger" icon="trash" loading={busy} onClick={onConfirm}>
            Elimina
          </Button>
        </div>
      </div>
    </div>
  )
}

function PackagesModal({ onClose, onError }) {
  const [rows, setRows] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPackages().then(
      () => setRows(PACKAGES.map((p) => ({ id: p.id, shots: String(p.shots), price: String(p.priceCents / 100) }))),
      (e) => setError(e.message),
    )
  }, [])

  const setField = (id, key) => (e) => setRows(rows.map((r) => (r.id === id ? { ...r, [key]: e.target.value } : r)))

  const save = async (e) => {
    e.preventDefault()
    const parsed = rows.map((r) => ({ id: r.id, shots: Number(r.shots), priceCents: Math.round(Number(r.price) * 100) }))
    if (parsed.some((p) => !Number.isInteger(p.shots) || p.shots <= 0 || !(p.priceCents >= 0))) {
      return setError('Colpi o prezzo non validi')
    }
    setSaving(true)
    setError('')
    try {
      for (const { id, shots, priceCents } of parsed) {
        await api(`/admin/packages/${id}`, { method: 'PUT', admin: true, body: { shots, priceCents } })
        Object.assign(packageById(id), { shots, priceCents })
      }
      onClose()
    } catch (err) {
      if (err.status === 401) onError(err)
      else setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <form
        className="modal-card day-add"
        role="dialog"
        aria-modal="true"
        aria-label="Pacchetti paintball"
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        noValidate
      >
        <h3>
          <span className="day-add-icon">
            <Icon name="target" size={22} />
          </span>
          <span>
            Pacchetti paintball
            <small>Colpi e prezzo a persona</small>
          </span>
        </h3>
        {rows === null ? (
          <span className="spinner" />
        ) : (
          rows.map((row) => {
            const pkg = packageById(row.id)
            return (
              <fieldset className={`package-card ${pkg.recommended ? 'recommended' : ''}`} key={row.id}>
                <legend className="sr-only">{pkg.name}</legend>
                <div className="package-card-head">
                  <b>{pkg.name}</b>
                  {pkg.recommended && <em>Consigliato</em>}
                  <small>{pkg.perks.join(' · ')}</small>
                </div>
                <div className="two-fields">
                  <Field label="Colpi" type="number" min="1" step="1" value={row.shots} onChange={setField(row.id, 'shots')} />
                  <Field
                    label="€ / persona"
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.price}
                    onChange={setField(row.id, 'price')}
                  />
                </div>
              </fieldset>
            )
          })
        )}
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <small className="modal-note">Le prenotazioni già effettuate mantengono il prezzo con cui sono state fatte.</small>
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" loading={saving} disabled={rows === null}>
            Salva
          </Button>
        </div>
      </form>
    </div>
  )
}

function Dashboard({ onLogout }) {
  const [tab, setTab] = useState('today')
  const [bookings, setBookings] = useState(null)
  const [slots, setSlots] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [clock, setClock] = useState(null)
  const [selected, setSelected] = useState([])
  const [query, setQuery] = useState('')
  const [activityFilter, setActivityFilter] = useState('')
  const [todayActivity, setTodayActivity] = useState('')
  const [bookingActivity, setBookingActivity] = useState('')
  const [bookingPeriod, setBookingPeriod] = useState('upcoming')
  const [slotPeriod, setSlotPeriod] = useState('upcoming')
  const [slotActivity, setSlotActivity] = useState('')
  const [slotDate, setSlotDate] = useState('')
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [packagesOpen, setPackagesOpen] = useState(false)
  const [, setPackagesLoaded] = useState(false)
  useEffect(() => {
    loadPackages().then(() => setPackagesLoaded(true), () => {})
  }, [packagesOpen])
  const [dayForm, setDayForm] = useState({ activity: ACTIVITIES[0].slug, time: '', price: '25' })
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

  const logout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    setError('')
    try {
      await api('/admin/logout', { method: 'POST', admin: true })
      setToken(null)
      onLogout()
    } catch (err) {
      if (err.status === 401) handleError(err)
      else setError(`Uscita non completata: ${err.message}. Riprova.`)
    } finally {
      setLoggingOut(false)
    }
  }

  // Lo storico (date passate) si scarica solo quando un filtro lo richiede.
  const needsHistory =
    bookingPeriod !== 'upcoming' ||
    slotPeriod !== 'upcoming' ||
    (!!slotDate && slotDate < today) ||
    (tab === 'calendar' && monthKey(calMonth[0], calMonth[1]) < today.slice(0, 7))
  const from = needsHistory ? '1970-01-01' : today

  const load = useCallback(
    (isCurrent = () => true) =>
      Promise.all([api(`/slots?from=${from}`), api(`/admin/bookings?from=${from}`, { admin: true }), api('/now')]).then(
        ([s, b, now]) => {
          if (!isCurrent()) return
          setSlots(s)
          setBookings(b)
          setClock({ date: now.date, minutes: toMinutes(now.time), at: Date.now() })
        },
        handleError,
      ),
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
    const priceCents = sessionPriceCents(activity, price)
    if (!date || !time) return setError('Inserisci data e ora della sessione')
    if (batch && !endDate) return setError('Inserisci la data di fine del periodo')
    if (batch && endDate < date) return setError('La data di fine precede quella di inizio')
    const dates = batch ? expandDates(date, endDate, days) : [date]
    if (!dates.length) return setError('Nessun giorno selezionato nel periodo')
    if (dates.length > MAX_DATES) return setError(`Massimo ${MAX_DATES} sessioni alla volta`)
    setSaving(true)
    setNotice(null)
    let result
    const ok = await run(async () => {
      result = batch
        ? await api('/admin/slots/bulk', { method: 'POST', admin: true, body: { activity, dates, time, priceCents } })
        : await api('/admin/slots', { method: 'POST', admin: true, body: { activity, date, time, priceCents } })
    })
    setSaving(false)
    if (!ok) return
    const priceInfo = activity === 'paintball' ? 'Prezzo in base al pacchetto' : euro(priceCents)
    if (!batch) setNotice({ title: 'Sessione creata', detail: [sessionLabel(activity, date, time), priceInfo] })
    else {
      const { created, skipped } = result
      if (!created) return setError('Nessuna sessione creata: le date scelte sono già trascorse, già occupate o in conflitto con altre sessioni')
      setNotice({
        title: plural(created, 'sessione creata', 'sessioni create'),
        detail: [
          `${activityName(activity)} · ${time} · dal ${formatShortDate(date)} al ${formatShortDate(endDate)}`,
          priceInfo,
          ...(skipped ? [`${plural(skipped, 'saltata', 'saltate')} (passate o in conflitto)`] : []),
        ],
      })
    }
    setSessionForm({ ...sessionForm, date: '', endDate: '', time: '' })
  }

  const addDaySession = async (e) => {
    e.preventDefault()
    const { activity, time, price } = dayForm
    if (!time) return setError('Inserisci l\'ora della sessione')
    setSaving(true)
    setNotice(null)
    const priceCents = sessionPriceCents(activity, price)
    const ok = await run(() =>
      api('/admin/slots', {
        method: 'POST',
        admin: true,
        body: { activity, date: calDate, time, priceCents },
      }),
    )
    setSaving(false)
    if (!ok) return
    setNotice({
      title: 'Sessione creata',
      detail: [sessionLabel(activity, calDate, time), activity === 'paintball' ? 'Prezzo in base al pacchetto' : euro(priceCents)],
    })
    setAddOpen(false)
    setDayForm({ ...dayForm, time: '' })
  }

  const askConfirm = (message, action, done) =>
    setConfirm({
      message,
      onConfirm: async () => {
        setConfirmBusy(true)
        setNotice(null)
        const ok = await run(action)
        setConfirmBusy(false)
        setConfirm(null)
        if (ok) setNotice(done)
      },
    })

  const remove = (path, message, done) => askConfirm(message, () => api(path, { method: 'DELETE', admin: true }), done)

  const deleteSelected = () => {
    const withBookings = chosen.filter((s) => bookedBySlot[s.id]).length
    askConfirm(
      `Eliminare ${plural(chosen.length, 'sessione', 'sessioni')}?` +
        (withBookings ? ` Verranno cancellate anche le prenotazioni di ${plural(withBookings, 'sessione', 'sessioni')}.` : ''),
      () => api('/admin/slots/delete', { method: 'POST', admin: true, body: { ids: chosen.map((s) => s.id) } }),
      {
        title: plural(chosen.length, 'sessione eliminata', 'sessioni eliminate'),
        detail: withBookings ? [`Con prenotazioni annullate in ${plural(withBookings, 'sessione', 'sessioni')}`] : undefined,
      },
    )
  }

  // Un orario scelto che diventa non valido (cambio di attività o data) viene azzerato.
  useEffect(() => {
    if (dayForm.time && blockedTimes(slots, clock, today, dayForm.activity, calDate)(dayForm.time)) {
      setDayForm((f) => ({ ...f, time: '' }))
    }
  }, [slots, clock, today, dayForm.activity, dayForm.time, calDate])

  useEffect(() => {
    const date = sessionForm.mode === 'single' ? sessionForm.date : ''
    if (sessionForm.time && blockedTimes(slots, clock, today, sessionForm.activity, date)(sessionForm.time)) {
      setSessionForm((f) => ({ ...f, time: '' }))
    }
  }, [slots, clock, today, sessionForm.activity, sessionForm.mode, sessionForm.date, sessionForm.time])

  useEffect(() => {
    if (addOpen) setError('')
  }, [addOpen])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 3500) // in sync con toast-bar in index.css
    return () => clearTimeout(id)
  }, [notice])

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
      (!bookingActivity || b.activity === bookingActivity) &&
      (!q || b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q)),
  )
  const visibleSlots = (slots ?? []).filter(
    (s) =>
      (!slotActivity || s.activity === slotActivity) &&
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
  const todaySlots = (slots ?? []).filter((s) => s.date === today && (!todayActivity || s.activity === todayActivity))
  const todayBooked = todaySlots.filter((s) => bookingBySlot[s.id])
  const todayPlayers = todayBooked.reduce((sum, s) => sum + bookingBySlot[s.id].players, 0)
  const chosen = visibleSlots.filter((s) => selected.includes(s.id))

  return (
    <main className="dashboard">
      <header className="dashboard-head">
        <div>
          <span className="manager-mark">
            <span className="logo-wings" />
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
            disabled={loggingOut}
            onClick={logout}
          >
            {loggingOut ? 'Uscita...' : 'Esci'}
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
        {confirm && <ConfirmDialog {...confirm} busy={confirmBusy} onCancel={() => setConfirm(null)} />}
        <div className="toast-stack">
          {error && !addOpen && (
            <div className="toast toast-error" role="alert">
              <span className="toast-icon" aria-hidden="true">
                !
              </span>
              <div className="toast-text">
                <strong>Operazione non riuscita</strong>
                <small>{error}</small>
              </div>
              <button type="button" className="toast-close" aria-label="Chiudi notifica" onClick={() => setError('')}>
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              <span className="toast-icon">
                <Icon name="check" size={18} />
              </span>
              <div className="toast-text">
                <strong>{notice.title}</strong>
                {notice.detail?.map((line) => (
                  <small key={line}>{line}</small>
                ))}
              </div>
              <button type="button" className="toast-close" aria-label="Chiudi notifica" onClick={() => setNotice(null)}>
                <Icon name="close" size={16} />
              </button>
              <span className="toast-bar" aria-hidden="true" />
            </div>
          )}
        </div>
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
        {tab === 'calendar' && (
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
        )}

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
              <div className="panel-tools no-print">
                <Select
                  label="Attività"
                  srOnly
                  value={todayActivity}
                  options={[['', 'Tutte le attività'], ...ACTIVITY_OPTIONS]}
                  onChange={setTodayActivity}
                />
                <Button className="btn-sm" variant="ghost" disabled={todaySlots.length === 0} onClick={() => window.print()}>
                  Stampa
                </Button>
              </div>
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
                      <th>Pacchetto</th>
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
                          <td>{booking ? bookingPackage(booking) : '—'}</td>
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
              onSelect={(iso) => {
                setCalDate(iso)
                if (iso >= today && !calendarSlots.some((s) => s.date === iso)) setAddOpen(true)
              }}
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
                  <p>Nessun turno in questo giorno.</p>
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
                                {booking.package && ` · ${packageName(booking.package)}`}
                              </small>
                            </>
                          ) : (
                            <small>{priceLabel(s)}</small>
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
                                remove(`/admin/bookings/${booking.id}`, `Annullare la prenotazione di ${booking.name}?`, {
                                  title: 'Prenotazione annullata',
                                  detail: [booking.name, sessionLabel(s.activity, s.date, s.time)],
                                })
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
                                {
                                  title: 'Sessione eliminata',
                                  detail: [
                                    sessionLabel(s.activity, s.date, s.time),
                                    ...(booking ? [`Prenotazione di ${booking.name} annullata`] : []),
                                  ],
                                },
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
              {calDate >= today && (
                <Button className="btn-sm" variant="ghost" icon="plus" onClick={() => setAddOpen(true)}>
                  Aggiungi sessione
                </Button>
              )}
              {addOpen && (
                <div className="modal-backdrop" onClick={() => setAddOpen(false)} onKeyDown={(e) => e.key === 'Escape' && setAddOpen(false)}>
                  <form
                    className="modal-card day-add"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Nuova sessione del ${formatDate(calDate)}`}
                    onClick={(e) => e.stopPropagation()}
                    onSubmit={addDaySession}
                    noValidate
                  >
                    <h3>
                      <span className="day-add-icon">
                        <Icon name={activityBySlug(dayForm.activity)?.icon ?? 'target'} size={22} />
                      </span>
                      Nuova sessione · {formatShortDate(calDate)}
                    </h3>
                    <Select
                      label="Attività"
                      value={dayForm.activity}
                      options={ACTIVITY_OPTIONS}
                      onChange={(activity) => setDayForm({ ...dayForm, activity })}
                    />
                    <TimeField
                      value={dayForm.time}
                      isBlocked={blockedTimes(slots, clock, today, dayForm.activity, calDate)}
                      onChange={(time) => setDayForm({ ...dayForm, time })}
                    />
                    {dayForm.activity !== 'paintball' && (
                      <Field
                        label="Prezzo (€)"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={dayForm.price}
                        onChange={(e) => setDayForm({ ...dayForm, price: e.target.value })}
                      />
                    )}
                    {dayForm.activity === 'paintball' && (
                      <ul className="day-packages" aria-label="Pacchetti paintball attivi">
                        {PACKAGES.map((p) => (
                          <li key={p.id}>
                            <b>{p.name}</b>
                            <span>{p.shots} colpi</span>
                            <strong>{euro(p.priceCents)}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                    {error && (
                      <p className="alert" role="alert">
                        {error}
                      </p>
                    )}
                    <div className="modal-actions">
                      <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                        Annulla
                      </Button>
                      <Button type="submit" icon="plus" loading={saving}>
                        Aggiungi
                      </Button>
                    </div>
                  </form>
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
                <Select label="Mostra" srOnly value={bookingPeriod} options={PERIODS} onChange={setBookingPeriod} />
                <Select
                  label="Attività"
                  srOnly
                  value={bookingActivity}
                  options={[['', 'Tutte le attività'], ...ACTIVITY_OPTIONS]}
                  onChange={setBookingActivity}
                />
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
                      <th>Pacchetto</th>
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
                        <td>{bookingPackage(booking)}</td>
                        <td>
                          <button
                            type="button"
                            className="delete"
                            aria-label={`Elimina prenotazione di ${booking.name}`}
                            onClick={() =>
                              remove(`/admin/bookings/${booking.id}`, `Cancellare la prenotazione di ${booking.name}?`, {
                                title: 'Prenotazione eliminata',
                                detail: [booking.name, sessionLabel(booking.activity, booking.date, booking.time)],
                              })
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
              <Select
                label="Attività"
                value={sessionForm.activity}
                options={ACTIVITY_OPTIONS}
                onChange={(activity) => setSessionForm({ ...sessionForm, activity })}
              />
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
              <TimeField
                value={sessionForm.time}
                isBlocked={blockedTimes(slots, clock, today, sessionForm.activity, sessionForm.mode === 'single' ? sessionForm.date : '')}
                onChange={(time) => setSessionForm({ ...sessionForm, time })}
              />
              {sessionForm.activity !== 'paintball' && (
                <Field
                  label="Prezzo (€)"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={sessionForm.price}
                  onChange={setField('price')}
                />
              )}
              <Button type="submit" icon="plus" loading={saving}>
                Aggiungi turni
              </Button>
              {sessionForm.activity === 'paintball' && (
                <Button type="button" variant="ghost" onClick={() => setPackagesOpen(true)}>
                  Modifica pacchetti
                </Button>
              )}
            </form>
            {packagesOpen && <PackagesModal onClose={() => setPackagesOpen(false)} onError={handleError} />}
            <div className="admin-panel session-list">
              <div>
                <h2>Sessioni</h2>
                <p>Tutti i turni creati, con le prenotazioni ricevute.</p>
              </div>
              <div className="session-filters">
                <Select label="Mostra" value={slotPeriod} options={PERIODS} disabled={!!slotDate} onChange={setSlotPeriod} />
                <Select label="Attività" value={slotActivity} options={[['', 'Tutte'], ...ACTIVITY_OPTIONS]} onChange={setSlotActivity} />
                <Field label="Data" type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
              </div>
              <div className="session-bulk">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={visibleSlots.length > 0 && chosen.length === visibleSlots.length}
                    disabled={visibleSlots.length === 0}
                    onChange={(e) => setSelected(e.target.checked ? visibleSlots.map((s) => s.id) : [])}
                  />
                  <span>{chosen.length ? plural(chosen.length, 'selezionata', 'selezionate') : 'Seleziona tutte'}</span>
                </label>
                {chosen.length > 0 && (
                  <Button className="btn-sm" variant="ghost" icon="trash" onClick={deleteSelected}>
                    Elimina selezionate
                  </Button>
                )}
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
                        <input
                          type="checkbox"
                          className="row-check"
                          aria-label={`Seleziona ${sessionLabel(session.activity, session.date, session.time)}`}
                          checked={selected.includes(session.id)}
                          onChange={() =>
                            setSelected((cur) => (cur.includes(session.id) ? cur.filter((id) => id !== session.id) : [...cur, session.id]))
                          }
                        />
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
                        <strong>{priceLabel(session)}</strong>
                      </div>
                      <span className="row-actions">
                        <button
                          type="button"
                          className="delete"
                          aria-label={`Elimina sessione ${activityName(session.activity)} del ${formatShortDate(session.date)} alle ${session.time}`}
                          onClick={() =>
                            remove(
                              `/admin/slots/${session.id}`,
                              'Eliminare la sessione? Verranno cancellate anche tutte le sue prenotazioni.',
                              {
                                title: 'Sessione eliminata',
                                detail: [
                                  sessionLabel(session.activity, session.date, session.time),
                                  ...(bookedBySlot[session.id]
                                    ? [plural(bookedBySlot[session.id].bookings, 'prenotazione annullata', 'prenotazioni annullate')]
                                    : []),
                                ],
                              },
                            )
                          }
                        >
                          <Icon name="trash" size={18} />
                        </button>
                      </span>
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
