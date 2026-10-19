import { useEffect, useState } from 'react'
import { api, euro, formatDate } from '../api.js'

const empty = { name: '', email: '', phone: '', players: 1 }

export default function Book() {
  const [slots, setSlots] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const load = () =>
    api('/slots').then(setSlots).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api('/bookings', {
        method: 'POST',
        body: { slotId: selected.id, ...form, players: Number(form.players) },
      })
      setDone(true)
      setSelected(null)
      setForm(empty)
      load()
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  const byDate = (slots || []).reduce((acc, s) => {
    ;(acc[s.date] ||= []).push(s)
    return acc
  }, {})
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <h1>Prenota una sessione</h1>
      {done && <p className="ok">Prenotazione registrata! Ci vediamo in campo.</p>}
      {error && <p className="err">{error}</p>}

      {selected ? (
        <form onSubmit={submit} className="card form">
          <h3>{formatDate(selected.date)} · {selected.time}</h3>
          <p>{euro(selected.price_cents)} a persona · posti liberi: {selected.available}</p>
          <label>Nome<input required value={form.name} onChange={set('name')} maxLength={100} /></label>
          <label>Email<input required type="email" value={form.email} onChange={set('email')} /></label>
          <label>Telefono<input required value={form.phone} onChange={set('phone')} maxLength={30} /></label>
          <label>
            Giocatori
            <input required type="number" min="1" max={selected.available} value={form.players} onChange={set('players')} />
          </label>
          <div className="row">
            <button className="btn">Conferma prenotazione</button>
            <button type="button" className="btn ghost" onClick={() => setSelected(null)}>Indietro</button>
          </div>
        </form>
      ) : slots === null ? (
        <p>Caricamento…</p>
      ) : slots.length === 0 ? (
        <p>Nessuna sessione disponibile al momento.</p>
      ) : (
        Object.entries(byDate).map(([date, list]) => (
          <section key={date}>
            <h3 className="cap">{formatDate(date)}</h3>
            <div className="slots">
              {list.map((s) => (
                <button
                  key={s.id}
                  className="slot"
                  disabled={s.available <= 0}
                  onClick={() => {
                    setDone(false)
                    setError('')
                    setSelected(s)
                  }}
                >
                  <strong>{s.time}</strong>
                  <span>{s.available > 0 ? `${s.available} posti · ${euro(s.price_cents)}` : 'Completo'}</span>
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  )
}
