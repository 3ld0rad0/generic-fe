import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, euro, formatDate, toISO, todayISO } from '../api.js'
import { Button, ButtonLink, Field, Icon } from '../ui.jsx'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY_FORM = { name: '', email: '', phone: '' }

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
      <div className="calendar-grid">
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
          const hasSeats = daySlots?.some((s) => s.available > 0)
          return (
            <button
              type="button"
              key={iso}
              disabled={iso < today || !daySlots}
              className={selected === iso ? 'selected' : ''}
              aria-pressed={selected === iso}
              aria-label={`${formatDate(iso)}${hasSeats ? ', posti disponibili' : ''}`}
              onClick={() => onSelect(iso)}
            >
              {i + 1}
              {hasSeats && <i />}
            </button>
          )
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i /> Disponibilità
        </span>
        <span>
          <i className="selected-dot" /> Selezionato
        </span>
      </div>
    </div>
  )
}

function SlotCard({ slot, selected, onClick }) {
  const full = slot.available <= 0
  const low = !full && slot.available <= 3
  return (
    <button
      type="button"
      className={`slot-card ${selected ? 'selected' : ''}`}
      disabled={full}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="slot-radio">{selected && <i />}</span>
      <strong>{slot.time}</strong>
      <span>
        {euro(slot.price_cents)} <small>/ persona</small>
      </span>
      <em className={full ? 'full' : low ? 'low' : 'available'}>
        {full
          ? 'Completo'
          : slot.available === 1
            ? 'Ultimo posto'
            : low
              ? `Ultimi ${slot.available} posti`
              : `${slot.available} posti liberi`}
      </em>
    </button>
  )
}

function Summary({ slot, players }) {
  return (
    <aside className="summary-card">
      <span className="eyebrow">Il tuo riepilogo</span>
      <h3>Paintball Experience</h3>
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
          <Icon name="users" size={19} /> Giocatori
        </span>
        <strong>{players}</strong>
      </div>
      <hr />
      <div className="total">
        <span>Totale</span>
        <strong>{euro(slot.price_cents * players)}</strong>
      </div>
      <small>Pagamento direttamente al campo</small>
    </aside>
  )
}

export default function Book() {
  const [today] = useState(todayISO)
  const [slots, setSlots] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [step, setStep] = useState(1)
  const [pickedDate, setPickedDate] = useState(null)
  const [pickedMonth, setPickedMonth] = useState(null)
  const [slotId, setSlotId] = useState(null)
  const [players, setPlayers] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(null)

  const load = useCallback(
    () =>
      api(`/slots?from=${today}`).then(
        (data) => {
          setSlots(data)
          setLoadError('')
          return data
        },
        (e) => {
          setLoadError(e.message)
          return null
        },
      ),
    [today],
  )

  useEffect(() => {
    load()
  }, [load])

  const byDate = useMemo(() => {
    const groups = {}
    for (const s of slots ?? []) (groups[s.date] ||= []).push(s)
    return groups
  }, [slots])

  const defaultDate = slots?.find((s) => s.available > 0)?.date ?? slots?.[0]?.date ?? null
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

  const retry = () => {
    setLoadError('')
    setSlots(null)
    load()
  }

  const goToDetails = () => {
    setPlayers((p) => Math.min(Math.max(p, 1), selectedSlot.available))
    setSubmitError('')
    setStep(2)
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = 'Inserisci il tuo nome e cognome'
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Inserisci un indirizzo email valido'
    const phone = form.phone.trim()
    if (phone.length < 5 || phone.length > 30) next.phone = 'Inserisci un numero di telefono valido'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const { id } = await api('/bookings', {
        method: 'POST',
        body: { slotId: selectedSlot.id, name: form.name.trim(), email: form.email.trim(), phone, players },
      })
      setConfirmed({ id, slot: selectedSlot, players, name: form.name.trim() })
      setStep(3)
      load()
    } catch (err) {
      setSubmitError(err.message)
      if (err.status === 404 || err.status === 409) {
        const fresh = await load()
        const slot = fresh?.find((s) => s.id === slotId)
        if (!slot || slot.available <= 0) {
          setSlotId(null)
          setStep(1)
        } else {
          setPlayers((p) => Math.min(p, slot.available))
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
    setForm(EMPTY_FORM)
    setErrors({})
    setSubmitError('')
    setConfirmed(null)
    load()
  }

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <main className="booking-page">
      <div className="page-hero compact">
        <span className="eyebrow">Prenotazione online</span>
        <h1>Preparati a giocare.</h1>
        <p>Scegli quando venire, dicci chi sei. Al resto pensiamo noi.</p>
      </div>
      <div className="booking-shell">
        <Progress current={step} />

        {step === 1 && (
          <section className="booking-step">
            <div className="booking-title">
              <span>01</span>
              <div>
                <h2>Scegli data e ora</h2>
                <p>Seleziona il giorno e la fascia oraria che preferisci.</p>
              </div>
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
              <Button disabled={!selectedSlot || selectedSlot.available <= 0} icon="arrow" onClick={goToDetails}>
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
                  maxLength={200}
                  value={form.email}
                  error={errors.email}
                  onChange={setField('email')}
                />
                <Field
                  label="Telefono"
                  type="tel"
                  placeholder="+39 333 000 0000"
                  autoComplete="tel"
                  maxLength={30}
                  value={form.phone}
                  error={errors.phone}
                  onChange={setField('phone')}
                />
                <div className="player-stepper">
                  <div>
                    <label id="players-label">Numero di giocatori</label>
                    <small>
                      Minimo 1, massimo {selectedSlot.available} {selectedSlot.available === 1 ? 'giocatore' : 'giocatori'}
                    </small>
                  </div>
                  <div role="group" aria-labelledby="players-label">
                    <button
                      type="button"
                      onClick={() => setPlayers(Math.max(1, players - 1))}
                      disabled={players <= 1}
                      aria-label="Riduci giocatori"
                    >
                      <Icon name="minus" size={18} />
                    </button>
                    <strong aria-live="polite">{players}</strong>
                    <button
                      type="button"
                      onClick={() => setPlayers(Math.min(selectedSlot.available, players + 1))}
                      disabled={players >= selectedSlot.available}
                      aria-label="Aumenta giocatori"
                    >
                      <Icon name="plus" size={18} />
                    </button>
                  </div>
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
            <h2>Ci vediamo sul campo!</h2>
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
