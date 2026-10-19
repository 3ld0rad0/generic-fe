import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Book from './pages/Book.jsx'
import Admin from './pages/Admin.jsx'
import { ButtonLink, SiteLayout } from './ui.jsx'

function NotFound() {
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
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin" element={<Admin />} />
    </Routes>
  )
}
