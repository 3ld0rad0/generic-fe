import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

const paths = {
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  facebook: <path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9c0-.6.4-1 1-1Z" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8V21h-3.6v-.2A2 2 0 0 0 9 19a2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1A2 2 0 0 0 4.6 15a2 2 0 0 0-1.8-1.2H2v-3.6h.8A2 2 0 0 0 4.6 9a2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1A2 2 0 0 0 9 4.6a2 2 0 0 0 1.2-1.8V2h3.6v.8A2 2 0 0 0 15 4.6a2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1A2 2 0 0 0 19.4 9a2 2 0 0 0 1.8 1.2h.8v3.6h-.8a2 2 0 0 0-1.8 1.2Z" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  minus: <path d="M5 12h14" />,
  phone: (
    <path d="M7 3h3l1.5 5-2 1.5a14 14 0 0 0 5 5l1.5-2L21 14v3c0 2.2-1.8 4-4 4C9.3 21 3 14.7 3 7c0-2.2 1.8-4 4-4Z" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  shield: (
    <>
      <path d="M12 3 4 6v5c0 5.3 3.4 8.4 8 10 4.6-1.6 8-4.7 8-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5a3 3 0 0 1 0 6M17 14c2.3.7 4 2.6 4 5" />
    </>
  ),
}

export function Icon({ name, size = 24 }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="Paintball Arena, home">
      <span className="logo-mark">
        <Icon name="target" size={26} />
      </span>
      <span>
        PAINTBALL <b>ARENA</b>
      </span>
    </Link>
  )
}

export function Button({ children, variant = 'primary', icon, className = '', type = 'button', ...props }) {
  return (
    <button type={type} className={`btn btn-${variant} ${className}`} {...props}>
      <span>{children}</span>
      {icon && <Icon name={icon} size={19} />}
    </button>
  )
}

export function ButtonLink({ to, children, variant = 'primary', icon }) {
  return (
    <Link className={`btn btn-${variant}`} to={to}>
      <span>{children}</span>
      {icon && <Icon name={icon} size={19} />}
    </Link>
  )
}

export function Field({ label, error, ...props }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      <input aria-invalid={error ? true : undefined} {...props} />
      {error && <small>{error}</small>}
    </label>
  )
}

export function SectionTitle({ eyebrow, title, copy }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  )
}

const homeAnchor = (id) => ({ pathname: '/', hash: `#${id}` })
const YEAR = new Date().getFullYear()

function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="navbar">
      <Logo />
      <nav
        className={open ? 'nav-links is-open' : 'nav-links'}
        aria-label="Navigazione principale"
        onClick={() => setOpen(false)}
      >
        <Link to={homeAnchor('campo')}>Il campo</Link>
        <Link to={homeAnchor('societa')}>Chi siamo</Link>
        <Link to={homeAnchor('contatti')}>Contatti</Link>
        <ButtonLink to="/prenota" icon="arrow">
          Prenota
        </ButtonLink>
      </nav>
      <button
        className="menu-button"
        type="button"
        aria-label={open ? 'Chiudi menu' : 'Apri menu'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name={open ? 'close' : 'menu'} />
      </button>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div>
          <Logo />
          <p>
            Adrenalina, strategia e divertimento
            <br />a pochi minuti dalla città.
          </p>
        </div>
        <div>
          <h3>Esplora</h3>
          <Link to={homeAnchor('campo')}>Il campo</Link>
          <Link to={homeAnchor('societa')}>Chi siamo</Link>
          <Link to="/prenota">Prenota</Link>
        </div>
        <div>
          <h3>Contatti</h3>
          <a href="tel:+390212345678">+39 02 1234 5678</a>
          <a href="mailto:ciao@paintballarena.it">ciao@paintballarena.it</a>
          <span>Via del Bosco 24, Milano</span>
        </div>
        <div>
          <h3>Seguici</h3>
          <div className="socials">
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Icon name="instagram" />
            </a>
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook">
              <Icon name="facebook" />
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {YEAR} Paintball Arena</span>
        <span>Privacy · Cookie · Termini</span>
        <Link to="/admin">Area gestore</Link>
      </div>
    </footer>
  )
}

export function SiteLayout() {
  const { pathname, hash, key } = useLocation()
  useEffect(() => {
    const target = hash && document.getElementById(hash.slice(1))
    if (target) target.scrollIntoView()
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash, key])
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  )
}
