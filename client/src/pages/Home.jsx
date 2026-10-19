import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Il tuo campo da paintball</h1>
        <p>Partite adrenaliniche per gruppi di amici, feste e team building.</p>
        <Link to="/prenota" className="btn">Prenota una sessione</Link>
      </section>
      <section className="grid">
        <div className="card">
          <h3>Come funziona</h3>
          <p>Scegli una sessione, indica quanti siete e prenota. Briefing e attrezzatura inclusi.</p>
        </div>
        <div className="card">
          <h3>Dove siamo</h3>
          <p>Via del Campo 1, Città (da personalizzare)</p>
        </div>
        <div className="card">
          <h3>Contatti</h3>
          <p>info@example.com · +39 000 000 0000</p>
        </div>
      </section>
    </>
  )
}
