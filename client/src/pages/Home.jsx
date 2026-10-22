import { Link } from 'react-router-dom'
import { ACTIVITIES } from '../api.js'
import { usePageMeta } from '../helpers.js'
import { ButtonLink, Icon, SectionTitle } from '../ui.jsx'

const images = {
  hero: '/hero.jpg',
  team: '/team.jpg',
}

const features = [
  {
    icon: 'gear',
    title: 'Attrezzatura inclusa',
    copy: 'Tutto il necessario per ogni attività, controllato e pronto all’uso.',
  },
  {
    icon: 'shield',
    title: 'Sicurezza prima',
    copy: 'Briefing e assistenza continua da parte dei nostri istruttori.',
  },
  {
    icon: 'users',
    title: 'Per tutti',
    copy: 'Singoli, gruppi di amici, team aziendali e feste speciali.',
  },
]

const steps = [
  ['target', '01', 'Scegli l’attività', 'Paintball, tiro con l’arco o carabina: scegli la tua sfida.'],
  ['calendar', '02', 'Scegli data e orario', 'Controlla le date disponibili in tempo reale.'],
  ['check', '03', 'Conferma', 'Inserisci i tuoi dati. Al resto pensiamo noi.'],
]

export default function Home() {
  usePageMeta({})
  return (
    <main className="home">
      <section className="hero" style={{ backgroundImage: `url(${images.hero})` }}>
        <div className="hero-noise" />
        <div className="hero-content">
          <span className="hero-kicker">Milano · Poligono e outdoor</span>
          <h1>
            Scegli la tua sfida.
            <br />
            <em>Prenota la tua sessione.</em>
          </h1>
          <p>Paintball, tiro con l'arco e carabina: precisione, adrenalina e divertimento in un unico posto.</p>
          <ButtonLink to="/prenota" icon="arrow">
            Prenota ora
          </ButtonLink>
        </div>
        <Link className="scroll-cue" to={{ hash: '#attivita' }}>
          <span>Scorri</span>
          <span className="scroll-line" />
          <Icon name="chevron" size={18} />
        </Link>
      </section>

      <section className="panel field-section" id="attivita">
        <div className="section-inner">
          <SectionTitle
            eyebrow="01 · Le attività"
            title="Scegli come metterti alla prova."
            copy="Tre discipline, un unico poligono. Prenota quella che preferisci in pochi click."
          />
          <div className="feature-grid">
            {ACTIVITIES.map((activity) => (
              <Link className="feature-card activity-card" key={activity.slug} to={`/prenota?activity=${activity.slug}`}>
                <span className="feature-icon">
                  <Icon name={activity.icon} size={28} />
                </span>
                <h3>{activity.name}</h3>
                <p>{activity.copy}</p>
                <span className="activity-cta">
                  Prenota <Icon name="arrow" size={16} />
                </span>
              </Link>
            ))}
          </div>
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
        </div>
      </section>

      <section className="panel story-section" id="societa">
        <div className="section-inner story-grid">
          <div className="story-copy">
            <SectionTitle eyebrow="02 · La società" title="Una passione diventata poligono." />
            <p>
              Siamo appassionati prima ancora che organizzatori. Dal 2012 creiamo esperienze sicure, coinvolgenti e
              accessibili a tutti: gruppi di amici, team aziendali e feste speciali.
            </p>
            <p>Il nostro staff ti accompagna dal primo briefing all'ultimo colpo. Tu pensa solo a divertirti.</p>
            <div className="stats">
              <div>
                <strong>12</strong>
                <span>anni di attività</span>
              </div>
              <div>
                <strong>24k</strong>
                <span>partecipanti</span>
              </div>
              <div>
                <strong>3.8k</strong>
                <span>sessioni</span>
              </div>
            </div>
          </div>
          <div className="story-image">
            <img src={images.team} alt="Il team di Cardinali Poligono" />
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
            title="Dalla scelta al poligono."
            copy="Prenotare è facile. In tre passaggi sei pronto a partire."
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
              title="Ci vediamo al poligono."
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
              <a href="mailto:info@cardinalipoligono.it">
                <Icon name="mail" />
                <span>
                  <small>Scrivici</small>info@cardinalipoligono.it
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
              <strong>Cardinali Poligono</strong>
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
