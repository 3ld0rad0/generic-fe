import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Book from './pages/Book.jsx'
import Admin from './pages/Admin.jsx'
import { Cookies, Privacy, Terms } from './pages/Legal.jsx'
import { usePageMeta } from './helpers.js'
import { ButtonLink, SiteLayout } from './ui.jsx'

function NotFound() {
  usePageMeta({ title: 'Pagina non trovata', noindex: true })
  return (
    <main className="booking-page">
      <div className="page-hero">
        <span className="eyebrow">Errore 404</span>
        <h1>Pagina non trovata.</h1>
        <p>La pagina che cerchi non esiste o è stata spostata.</p>
      </div>
      <div className="center-action" style={{ margin: '0 0 120px' }}>
        <ButtonLink to="/" icon="arrow">
          Torna alla home
        </ButtonLink>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="prenota" element={<Book />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="cookie" element={<Cookies />} />
        <Route path="termini" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin" element={<Admin />} />
    </Routes>
  )
}
