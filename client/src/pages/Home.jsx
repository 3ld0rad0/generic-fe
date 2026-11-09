import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ACTIVITIES } from '../api.js'
import { usePageMeta } from '../helpers.js'
import { ButtonLink, Icon, SectionTitle } from '../ui.jsx'

const MAPS_URL = 'https://maps.app.goo.gl/HQXorFtyS3bs26h77'

// Sfondo della home: 'image' (hero.jpg) oppure 'gif' (hero.gif, con hero.jpg come riserva mentre carica o se manca).
const HERO_MEDIA = 'gif'
const HERO_SOURCES = { image: ['/hero.jpg'], gif: ['/hero.gif', '/hero.jpg'] }

const images = {
  hero: HERO_SOURCES[HERO_MEDIA].map((src) => `url(${src})`).join(', '),
}

// Foto del carosello "La società": i file stanno in client/public. `position` è l'object-position opzionale.
const CAROUSEL_INTERVAL_MS = 5000
const storyPhotos = [
  { src: '/gruppo.jpg', alt: 'Il team di Cardinali Poligono Club sul campo di tiro' },
  { src: '/bersagli.jpeg', alt: 'Le linee di tiro con i bersagli' },
  { src: '/ostacoli_paintball.jpeg', alt: 'Maschera e marcatore davanti agli ostacoli del campo paintball', position: 'center 80%' },
  { src: '/foto-arco.jpg', alt: 'Un arciere in posizione di tiro', position: 'center 30%' },
  { src: '/lezioni_bambini.jpeg', alt: 'Un istruttore insegna a tirare con l’arco a un bambino', position: 'center 60%' },
]

function PhotoCarousel({ photos }) {
  const track = useRef(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const go = (i) => {
    const el = track.current
    el.scrollTo({ left: ((i + photos.length) % photos.length) * el.clientWidth, behavior: 'smooth' })
  }

  // Il timer riparte a ogni cambio foto, anche manuale; si ferma con mouse, focus o dito sul carosello.
  useEffect(() => {
    if (paused || photos.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setTimeout(() => go(index + 1), CAROUSEL_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [index, paused, photos.length])

  return (
    <div
      className="carousel"
      role="region"
      aria-roledescription="carosello"
      aria-label="Foto del poligono"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div
        className="carousel-track"
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {photos.map((photo) => (
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            loading="lazy"
            draggable={false}
            style={photo.position ? { objectPosition: photo.position } : undefined}
          />
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button type="button" className="carousel-btn prev" aria-label="Foto precedente" onClick={() => go(index - 1)}>
            <Icon name="chevron" size={22} />
          </button>
          <button type="button" className="carousel-btn next" aria-label="Foto successiva" onClick={() => go(index + 1)}>
            <Icon name="chevron" size={22} />
          </button>
          <div className="carousel-dots">
            {photos.map((photo, i) => (
              <button
                type="button"
                key={photo.src}
                aria-label={`Vai alla foto ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
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
      <section className="hero" style={{ backgroundImage: images.hero }}>
        <div className="hero-noise" />
        <div className="hero-content">
          <span className="hero-kicker">Ponte Corvo (CS) · Poligono e outdoor</span>
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
          <div className="feature-grid desktop-only">
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
                <strong>100+</strong>
                <span>iscritti</span>
              </div>
              <div>
                <strong>{ACTIVITIES.length}</strong>
                <span>attività</span>
              </div>
            </div>
          </div>
          <div className="story-image">
            <PhotoCarousel photos={storyPhotos} />
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
              <a href={MAPS_URL} target="_blank" rel="noreferrer">
                <Icon name="map" />
                <span>
                  <small>Dove siamo</small>Ponte Corvo, 87046 (CS)
                </span>
              </a>
              <div>
                <Icon name="phone" />
                <span>
                  <small>Chiamaci</small>
                  <a href="tel:+393421428985">+39 342 142 8985</a>
                  <br />
                  <a href="tel:+393356448314">+39 335 644 8314</a>
                </span>
              </div>
              <a href="mailto:cardinalipoligono@libero.it">
                <Icon name="mail" />
                <span>
                  <small>Scrivici</small>cardinalipoligono@libero.it
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
              <span>Ponte Corvo, 87046 (CS)</span>
              <a href={MAPS_URL} target="_blank" rel="noreferrer">
                Apri in Google Maps <Icon name="arrow" size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
