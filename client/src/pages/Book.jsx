import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ACTIVITIES,
  activityBySlug,
  api,
  cleanEmail,
  cleanName,
  cleanPhone,
  euro,
  forgetCustomer,
  formatDate,
  loadCustomer,
  saveCustomer,
  toISO,
  todayISO,
} from '../api.js'
import { gridKeys, usePageMeta } from '../helpers.js'
import { Button, ButtonLink, Field, Icon } from '../ui.jsx'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const EMPTY_FORM = { name: '', email: '', phone: '' }
const MAX_PLAYERS = 100

const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`

function Progress({ current }) {
  return (
    <div className="progress-steps">
      {['Data e ora', 'Dati personali', 'Conferma'].map((label, i) => (
        <div className={`${i + 1 === current ? 'active' : ''} ${i + 1 < current ? 'done' : ''}`} key={label}>
          <span>{i + 1 < current ? <Icon name="check" size={16} /> : i + 1}</span>
          <b>{label}</b>
        </div>
      ))}
    </div>
  )
}

function Calendar({ month, onMonthChange, byDate, selected, onSelect, lastDate, today }) {
  const [year, m] = month
  const offset = (new Date(year, m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const current = monthKey(year, m)
  const label = new Date(year, m, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const enabledDays = Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(year, m, i + 1))).filter(
    (iso) => iso >= today && byDate[iso],
  )
  // Un solo giorno entra nell'ordine di tabulazione; le frecce spostano il fuoco tra gli altri.
  const tabStop = enabledDays.includes(selected) ? selected : enabledDays[0]

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button
          type="button"
          aria-label="Mese precedente"
          disabled={current <= today.slice(0, 7)}
          onClick={() => onMonthChange(new Date(year, m - 1, 1))}
        >
          ‹
        </button>
        <h3>{label}</h3>
        <button
          type="button"
          aria-label="Mese successivo"
          disabled={!lastDate || lastDate.slice(0, 7) <= current}
          onClick={() => onMonthChange(new Date(year, m + 1, 1))}
        >
          ›
        </button>
      </div>
      <div className="calendar-grid" onKeyDown={gridKeys}>
        {WEEKDAYS.map((d) => (
          <span className="weekday" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const iso = toISO(new Date(year, m, i + 1))
          const daySlots = byDate[iso]
          return (
            <button
              type="button"
              key={iso}
              disabled={iso < today || !daySlots}
              tabIndex={iso === tabStop ? 0 : -1}
              className={`${daySlots ? 'day-available' : ''} ${selected === iso ? 'selected' : ''}`}
              aria-pressed={selected === iso}
              aria-label={`${formatDate(iso)}${daySlots ? ', disponibile' : ''}`}
              onClick={() => onSelect(iso)}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i /> Disponibile
        </span>
        <span>
          <i className="selected-dot" /> Selezionato
        </span>
      </div>
    </div>
  )
}

function SlotCard({ slot, selected, onClick }) {
  return (
    <button
      type="button"
      className={`slot-card ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="slot-radio">{selected && <i />}</span>
      <strong>{slot.time}</strong>
      <span>
        {euro(slot.price_cents)} <small>/ prenotazione</small>
      </span>
    </button>
  )
}

function Summary({ slot, players }) {
  return (
    <aside className="summary-card">
      <span className="eyebrow">Il tuo riepilogo</span>
      <h3>{activityBySlug(slot.activity)?.name ?? slot.activity}</h3>
      <div>
        <span>
          <Icon name="calendar" size={19} /> Data
        </span>
        <strong>{formatDate(slot.date)}</strong>
      </div>
      <div>
        <span>
          <Icon name="clock" size={19} /> Orario
        </span>
        <strong>{slot.time}</strong>
      </div>
      <div>
        <span>
          <Icon name="users" size={19} /> Partecipanti
        </span>
        <strong>{players}</strong>
      </div>
      <hr />
      <div className="total">
        <span>Totale</span>
        <strong>{euro(slot.price_cents)}</strong>
      </div>
      <small>Pagamento direttamente al poligono</small>
    </aside>
  )
}

export default function Book() {
  usePageMeta({
    title: 'Prenota una sessione',
    description: 'Scegli attività, giorno e orario e prenota online paintball, tiro con l’arco o carabina a Milano.',
  })
  const [params] = useSearchParams()
  const [today] = useState(todayISO)
  const [activity, setActivity] = useState(() => activityBySlug(params.get('activity'))?.slug ?? ACTIVITIES[0].slug)
  const activityRef = useRef(activity)
  const [slots, setSlots] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [step, setStep] = useState(1)
  const [pickedDate, setPickedDate] = useState(null)
  const [pickedMonth, setPickedMonth] = useState(null)
  const [slotId, setSlotId] = useState(null)
  const [players, setPlayers] = useState(1)
  const [saved, setSaved] = useState(loadCustomer)
  const [form, setForm] = useState(() => saved ?? EMPTY_FORM)
  const [remember, setRemember] = useState(() => !!saved)
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(null)

  const load = useCallback(
    () =>
      api(`/slots?from=${today}&activity=${activity}`).then(
        (all) => {
          if (activityRef.current !== activity) return null
          const data = all.filter((s) => s.bookable)
          setSlots(data)
          setLoadError('')
          return data
        },
        (e) => {
          if (activityRef.current === activity) setLoadError(e.message)
          return null
        },
      ),
    [today, activity],
  )

  useEffect(() => {
    load()
  }, [load])

  const chooseActivity = (slug) => {
    if (slug === activity) return
    activityRef.current = slug
    setActivity(slug)
    setSlots(null)
    setLoadError('')
    setPickedDate(null)
    setPickedMonth(null)
    setSlotId(null)
    setSubmitError('')
  }

  const byDate = useMemo(() => {
    const groups = {}
    for (const s of slots ?? []) (groups[s.date] ||= []).push(s)
    return groups
  }, [slots])

  const defaultDate = slots?.[0]?.date ?? null
  const date = pickedDate ?? defaultDate
  const month = pickedMonth ?? [Number((date ?? today).slice(0, 4)), Number((date ?? today).slice(5, 7)) - 1]
  const daySlots = (date && byDate[date]) || []
  const selectedSlot = slots?.find((s) => s.id === slotId) ?? null
  const dateLabel = date ? formatDate(date) : 'Nessuna data'

  const selectDate = (iso) => {
    setPickedDate(iso)
    setSlotId(null)
    setSubmitError('')
  }

  const isWeekend = (iso) => [0, 6].includes(new Date(`${iso}T00:00:00`).getDay())
  const firstDate = slots?.[0]?.date ?? null
  const weekendDate = slots?.find((s) => isWeekend(s.date))?.date ?? null
  const jumpTo = (iso) => {
    selectDate(iso)
    setPickedMonth([Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1])
  }

  const retry = () => {
    setLoadError('')
    setSlots(null)
    load()
  }

  const goToDetails = () => {
    setSubmitError('')
    setStep(2)
  }

  const submit = async (e) => {
    e.preventDefault()
    const name = cleanName(form.name)
    const email = cleanEmail(form.email)
    const phone = cleanPhone(form.phone)
    const next = {}
    if (!name) next.name = 'Inserisci nome e cognome (solo lettere, spazi, apostrofi e trattini)'
    if (!email) next.email = 'Inserisci un indirizzo email valido'
    if (!phone) next.phone = 'Inserisci un numero valido (6-15 cifre, es. +39 333 123 4567)'
    if (!consent) next.consent = 'Per prenotare devi accettare l’informativa privacy'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const { id } = await api('/bookings', {
        method: 'POST',
        body: { slotId: selectedSlot.id, name, email, phone, players, consent: true },
      })
      if (remember) {
        saveCustomer({ name, email, phone })
        setSaved({ name, email, phone })
      } else {
        forgetCustomer()
        setSaved(null)
      }
      setConfirmed({ id, slot: selectedSlot, players, name })
      setStep(3)
      load()
    } catch (err) {
      setSubmitError(err.message)
      if (err.status === 404 || err.status === 400 || err.status === 409) {
        const fresh = await load()
        if (!fresh?.some((s) => s.id === slotId)) {
          setSlotId(null)
          setStep(1)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setStep(1)
    setPickedDate(null)
    setPickedMonth(null)
    setSlotId(null)
    setPlayers(1)
    setForm(remember ? (loadCustomer() ?? EMPTY_FORM) : EMPTY_FORM)
    setConsent(false)
    setErrors({})
    setSubmitError('')
    setConfirmed(null)
    load()
  }

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const forgetMe = () => {
    forgetCustomer()
    setSaved(null)
    setRemember(false)
    setForm(EMPTY_FORM)
  }

  return (
    <main className="booking-page">
      <div className="page-hero compact">
        <span className="eyebrow">Prenotazione online</span>
        <h1>Prenota la tua sessione.</h1>
        <p>Scegli l'attività e quando venire, dicci chi sei. Al resto pensiamo noi.</p>
      </div>
      <div className="booking-shell">
        <Progress current={step} />

        {step === 1 && (
          <section className="booking-step">
            <div className="booking-title">
              <span>01</span>
              <div>
                <h2>Scegli attività, data e ora</h2>
                <p>Seleziona l'attività, il giorno e la fascia oraria che preferisci.</p>
                <p>Le prenotazioni si chiudono un'ora prima dell'inizio di ogni sessione.</p>
              </div>
            </div>
            <div className="activity-picker" role="group" aria-label="Attività">
              {ACTIVITIES.map((a) => (
                <button
                  type="button"
                  key={a.slug}
                  className={a.slug === activity ? 'selected' : ''}
                  aria-pressed={a.slug === activity}
                  onClick={() => chooseActivity(a.slug)}
                >
                  <Icon name={a.icon} size={26} />
                  {a.name}
                </button>
              ))}
            </div>
            <div className="quick-picks" role="group" aria-label="Scorciatoie per la data">
              <span>Scegli al volo</span>
              <button type="button" disabled={!firstDate} onClick={() => jumpTo(firstDate)}>
                Prima data libera
              </button>
              <button type="button" disabled={!weekendDate} onClick={() => jumpTo(weekendDate)}>
                Primo weekend libero
              </button>
            </div>
            <div className="date-time-grid">
              <Calendar
                month={month}
                onMonthChange={(d) => setPickedMonth([d.getFullYear(), d.getMonth()])}
                byDate={byDate}
                selected={date}
                onSelect={selectDate}
                lastDate={slots?.at(-1)?.date}
                today={today}
              />
              <div className="slots-panel" aria-live="polite">
                <div className="slots-head">
                  <div>
                    <span className="eyebrow">Orari disponibili</span>
                    <h3>{dateLabel}</h3>
                  </div>
                  <Icon name="clock" />
                </div>
                {loadError ? (
                  <div className="state-card error">
                    <Icon name="close" size={34} />
                    <h4>Qualcosa è andato storto</h4>
                    <p>Non riusciamo a caricare gli orari ({loadError}).</p>
                    <Button variant="ghost" onClick={retry}>
                      Riprova
                    </Button>
                  </div>
                ) : slots === null ? (
                  <div className="state-card">
                    <span className="spinner" />
                    <h4>Caricamento orari...</h4>
                    <p>Un momento, stiamo verificando la disponibilità.</p>
                  </div>
                ) : daySlots.length === 0 ? (
                  <div className="state-card">
                    <Icon name="calendar" size={35} />
                    <h4>Nessun turno disponibile</h4>
                    <p>
                      {slots.length === 0
                        ? 'Al momento non ci sono sessioni prenotabili. Torna a trovarci presto.'
                        : 'Per questa data non ci sono sessioni. Prova un altro giorno.'}
                    </p>
                  </div>
                ) : (
                  <div className="slot-list">
                    {daySlots.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        selected={slotId === slot.id}
                        onClick={() => {
                          setSlotId(slot.id)
                          setSubmitError('')
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            {submitError && (
              <p className="alert" role="alert">
                {submitError}
              </p>
            )}
            <div className="booking-actions">
              <span>{selectedSlot ? `${dateLabel} · ${selectedSlot.time}` : 'Seleziona un orario per continuare'}</span>
              <Button disabled={!selectedSlot} icon="arrow" onClick={goToDetails}>
                Continua
              </Button>
            </div>
          </section>
        )}

        {step === 2 && selectedSlot && (
          <section className="booking-step">
            <div className="booking-title">
              <span>02</span>
              <div>
                <h2>I tuoi dati</h2>
                <p>Ci servono solo per confermare e gestire la prenotazione.</p>
              </div>
            </div>
            <div className="form-summary-grid">
              <form className="personal-form" onSubmit={submit} noValidate>
                <Field
                  label="Nome e cognome"
                  placeholder="Es. Luca Bianchi"
                  autoComplete="name"
                  maxLength={100}
                  value={form.name}
                  error={errors.name}
                  onChange={setField('name')}
                />
                <Field
                  label="Email"
                  type="email"
                  placeholder="nome@email.it"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  value={form.email}
                  error={errors.email}
                  onChange={setField('email')}
                />
                <Field
                  label="Telefono"
                  type="tel"
                  placeholder="+39 333 000 0000"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={30}
                  value={form.phone}
                  error={errors.phone}
                  onChange={setField('phone')}
                />
                <div className="player-stepper">
                  <div>
                    <label id="players-label">Numero di partecipanti</label>
                    <small>Indicativo: serve al gestore per organizzare la sessione</small>
                  </div>
                  <div role="group" aria-labelledby="players-label">
                    <button
                      type="button"
                      onClick={() => setPlayers(Math.max(1, players - 1))}
                      disabled={players <= 1}
                      aria-label="Riduci partecipanti"
                    >
                      <Icon name="minus" size={18} />
                    </button>
                    <strong aria-live="polite">{players}</strong>
                    <button
                      type="button"
                      onClick={() => setPlayers(Math.min(MAX_PLAYERS, players + 1))}
                      disabled={players >= MAX_PLAYERS}
                      aria-label="Aumenta partecipanti"
                    >
                      <Icon name="plus" size={18} />
                    </button>
                  </div>
                </div>
                <label className="check-field">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>
                    Ricorda i miei dati su questo dispositivo
                    {saved && (
                      <>
                        {' · '}
                        <button type="button" className="link-button" onClick={forgetMe}>
                          Dimentica i miei dati
                        </button>
                      </>
                    )}
                  </span>
                </label>
                <div className="consent-block">
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={consent}
                      aria-invalid={errors.consent ? true : undefined}
                      aria-describedby={errors.consent ? 'consent-error' : undefined}
                      onChange={(e) => {
                        setConsent(e.target.checked)
                        setErrors({ ...errors, consent: undefined })
                      }}
                    />
                    <span>
                      Ho letto l’
                      <Link to="/privacy" target="_blank">
                        informativa privacy
                      </Link>{' '}
                      e accetto il trattamento dei miei dati per gestire la prenotazione.
                    </span>
                  </label>
                  {errors.consent && (
                    <small className="check-error" id="consent-error">
                      {errors.consent}
                    </small>
                  )}
                </div>
                {submitError && (
                  <p className="alert" role="alert">
                    {submitError}
                  </p>
                )}
                <div className="form-actions">
                  <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>
                    Indietro
                  </Button>
                  <Button type="submit" icon="check" disabled={submitting}>
                    {submitting ? 'Invio in corso...' : 'Conferma prenotazione'}
                  </Button>
                </div>
              </form>
              <Summary slot={selectedSlot} players={players} />
            </div>
          </section>
        )}

        {step === 3 && confirmed && (
          <section className="confirmation">
            <div className="success-icon">
              <Icon name="check" size={45} />
            </div>
            <span className="eyebrow">Prenotazione confermata</span>
            <h2>Ci vediamo al poligono!</h2>
            <p>
              Prenotazione registrata a nome di <strong>{confirmed.name}</strong>.
              <br />
              Presentati 20 minuti prima per il briefing.
            </p>
            <Summary slot={confirmed.slot} players={confirmed.players} />
            <div className="confirmation-actions">
              <ButtonLink to="/" variant="secondary">
                Torna alla home
              </ButtonLink>
              <Button variant="ghost" onClick={reset}>
                Nuova prenotazione
              </Button>
            </div>
            <span className="booking-code">
              Numero prenotazione · <b>#{confirmed.id}</b>
            </span>
          </section>
        )}
      </div>
    </main>
  )
}
