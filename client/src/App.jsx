import { Link, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Book from './pages/Book.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <>
      <header className="nav">
        <Link to="/" className="brand">🎯 Paintball Arena</Link>
        <nav>
          <Link to="/">Info</Link>
          <Link to="/prenota">Prenota</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/prenota" element={<Book />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<p>Pagina non trovata.</p>} />
        </Routes>
      </main>
      <footer>
        <Link to="/admin">Area gestore</Link>
      </footer>
    </>
  )
}
