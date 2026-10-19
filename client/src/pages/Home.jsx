import { Link } from 'react-router-dom'
import { ButtonLink, Icon, SectionTitle } from '../ui.jsx'

const images = {
  hero: 'https://images.unsplash.com/photo-1557543237-519b4f6d3373?auto=format&fit=crop&w=2000&q=88',
  field: 'https://images.unsplash.com/photo-1614602371808-d408f4464758?auto=format&fit=crop&w=1200&q=85',
  player: 'https://images.unsplash.com/photo-1588432815128-363254491e4e?auto=format&fit=crop&w=1000&q=85',
  action: 'https://images.unsplash.com/photo-1550024733-e72f7e3ca906?auto=format&fit=crop&w=1200&q=85',
  team: 'https://images.unsplash.com/photo-1569512850497-bd83aa6a2425?auto=format&fit=crop&w=1400&q=85',
}

const features = [
  {
    icon: 'target',
    title: '3 campi da gioco',
    copy: 'Scenari outdoor diversi, ostacoli tattici e aree sempre rinnovate.',
  },
  {
    icon: 'gear',
    title: 'Tutto incluso',
    copy: 'Marcatore, maschera, protezioni e 300 paintball pronti per te.',
  },
  {
    icon: 'shield',
    title: 'Sicurezza prima',
    copy: 'Briefing e assistenza continua da parte dei nostri istruttori.',
  },
]

const steps = [
  ['calendar', '01', 'Scegli la data', 'Trova il giorno perfetto per tutta la squadra.'],
  ['clock', '02', 'Scegli l’orario', 'Controlla i posti disponibili in tempo reale.'],
  ['check', '03', 'Conferma', 'Inserisci i tuoi dati. Al resto pensiamo noi.'],
]

export default function Home() {
  return (
    <main className="home">
      <section className="hero" style={{ backgroundImage: `url(${images.hero})` }}>
        <div className="hero-noise" />
        <div className="hero-content">
          <span className="hero-kicker">Milano · Outdoor arena</span>
          <h1>
            Vivi l'azione.
            <br />
            <em>Prenota il tuo campo.</em>
          </h1>
          <p>Raduna la squadra, scegli il tuo scenario e preparati a una sfida che non dimenticherai.</p>
          <ButtonLink to="/prenota" icon="arrow">
            Prenota ora
          </ButtonLink>
        </div>
        <Link className="scroll-cue" to={{ hash: '#campo' }}>
          <span>Scorri</span>
          <span className="scroll-line" />
          <Icon name="chevron" size={18} />
        </Link>
      </section>

      <section className="panel field-section" id="campo">
        <div className="section-inner">
          <SectionTitle
            eyebrow="01 · Il campo"
            title="Il terreno è tuo."
            copy="Oltre 20.000 m² di natura e adrenalina. Ogni partita è diversa, ogni strategia può fare la differenza."
          />
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className="feature-icon">
                  <Icon name={feature.icon} size={28} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            ))}
          </div>
          <div className="gallery">
            <figure className="gallery-large">
              <img src={images.field} alt="Campo da paintball outdoor con ostacoli gonfiabili" />
              <figcaption>Scenario Speedball</figcaption>
            </figure>
            <figure>
              <img src={images.player} alt="Giocatore equipaggiato nel bosco" />
              <figcaption>Scenario Woodland</figcaption>
            </figure>
            <figure>
              <img src={images.action} alt="Giocatore durante una partita" />
              <figcaption>Zona tattica</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="panel story-section" id="societa">
        <div className="section-inner story-grid">
          <div className="story-copy">
            <SectionTitle eyebrow="02 · La società" title="Una passione diventata arena." />
            <p>
              Siamo giocatori prima ancora che organizzatori. Dal 2012 creiamo esperienze sicure, coinvolgenti e
              accessibili a tutti: gruppi di amici, team aziendali e feste speciali.
            </p>
            <p>Il nostro staff ti accompagna dal primo briefing all'ultimo colpo. Tu pensa solo alla strategia.</p>
            <div className="stats">
              <div>
                <strong>12</strong>
                <span>anni di attività</span>
              </div>
              <div>
                <strong>24k</strong>
                <span>giocatori</span>
              </div>
              <div>
                <strong>3.8k</strong>
                <span>partite</span>
              </div>
            </div>
          </div>
          <div className="story-image">
            <img src={images.team} alt="Squadra di giocatori sul campo" />
            <span>
              La nostra squadra,
              <br />
              la tua prossima sfida.
            </span>
          </div>
        </div>
      </section>

      <section className="panel steps-section">
        <div className="section-inner">
          <SectionTitle
            eyebrow="03 · Come funziona"
            title="Dalla scelta al campo."
            copy="Prenotare è facile. In tre passaggi sei pronto a giocare."
          />
          <div className="steps">
            {steps.map(([icon, number, title, copy]) => (
              <article className="step" key={number}>
                <span className="step-number">{number}</span>
                <div className="step-icon">
                  <Icon name={icon} size={30} />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="center-action">
            <ButtonLink to="/prenota" icon="arrow">
              Inizia ora
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contatti">
        <div className="section-inner contact-grid">
          <div>
            <SectionTitle
              eyebrow="04 · Contatti"
              title="Ci vediamo sul campo."
              copy="Hai dubbi, richieste speciali o un gruppo numeroso? Parliamone."
            />
            <div className="contact-list">
              <a href="https://maps.google.com" target="_blank" rel="noreferrer">
                <Icon name="map" />
                <span>
                  <small>Dove siamo</small>Via del Bosco 24, Milano
                </span>
              </a>
              <a href="tel:+390212345678">
                <Icon name="phone" />
                <span>
                  <small>Chiamaci</small>+39 02 1234 5678
                </span>
              </a>
              <a href="mailto:ciao@paintballarena.it">
                <Icon name="mail" />
                <span>
                  <small>Scrivici</small>ciao@paintballarena.it
                </span>
              </a>
              <div>
                <Icon name="clock" />
                <span>
                  <small>Orari</small>Mar–Ven 14:00–20:00
                  <br />
                  Sab–Dom 09:00–21:00
                </span>
              </div>
            </div>
          </div>
          <div className="map-placeholder">
            <div className="map-grid" />
            <div className="map-pin">
              <Icon name="target" size={30} />
            </div>
            <div className="map-card">
              <strong>Paintball Arena</strong>
              <span>Via del Bosco 24, Milano</span>
              <a href="https://maps.google.com" target="_blank" rel="noreferrer">
                Apri in Google Maps <Icon name="arrow" size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
