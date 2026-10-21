import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { activityBySlug, api, formatDate } from '../api.js'
import { Button, ButtonLink } from '../ui.jsx'

export default function Cancel() {
  const { token } = useParams()
  const [booking, setBooking] = useState(null)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    api(`/bookings/cancel/${encodeURIComponent(token)}`).then(setBooking, (e) => setError(e.message))
  }, [token])

  const cancel = async () => {
    setCancelling(true)
    setError('')
    try {
      await api(`/bookings/cancel/${encodeURIComponent(token)}`, { method: 'POST' })
      setDone(true)
    } catch (e) {
      setError(e.message)
      setCancelling(false)
    }
  }

  return (
    <main className="booking-page">
      <div className="page-hero compact">
        <span className="eyebrow">Prenotazione</span>
        <h1>{done ? 'Prenotazione annullata.' : 'Annulla prenotazione.'}</h1>
      </div>
      <div className="booking-shell">
        <section className="confirmation">
          {done ? (
            <p>La prenotazione è stata annullata. Grazie per avercelo comunicato!</p>
          ) : booking ? (
            <>
              <p>
                Prenotazione a nome di <strong>{booking.name}</strong>:{' '}
                <strong>{activityBySlug(booking.activity)?.name ?? booking.activity}</strong>, {formatDate(booking.date)}{' '}
                alle {booking.time} ({booking.players} {booking.players === 1 ? 'partecipante' : 'partecipanti'}).
              </p>
              {!booking.cancellable && <p className="alert">La sessione è già iniziata, non è più possibile annullare.</p>}
              {error && (
                <p className="alert" role="alert">
                  {error}
                </p>
              )}
              {booking.cancellable && (
                <Button icon="close" onClick={cancel} disabled={cancelling}>
                  {cancelling ? 'Annullamento...' : 'Conferma annullamento'}
                </Button>
              )}
            </>
          ) : error ? (
            <p className="alert" role="alert">
              {error}
            </p>
          ) : (
            <span className="spinner" />
          )}
          <div className="confirmation-actions">
            <ButtonLink to="/" variant="secondary">
              Torna alla home
            </ButtonLink>
          </div>
        </section>
      </div>
    </main>
  )
}
