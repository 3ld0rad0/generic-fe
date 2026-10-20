const TOKEN_KEY = 'adminToken'

export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const setToken = (t) =>
  t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY)

export async function api(path, { method = 'GET', body, admin = false } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (admin) headers.Authorization = `Bearer ${getToken()}`
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
  } catch {
    throw new Error('Impossibile contattare il server')
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (admin && res.status === 401) setToken(null)
    const err = new Error(data.error || 'Errore di rete')
    err.status = res.status
    throw err
  }
  return data
}

export const ACTIVITIES = [
  {
    slug: 'paintball',
    name: 'Paintball',
    icon: 'target',
    copy: 'Campi outdoor con ostacoli tattici. Marcatore, maschera e protezioni inclusi.',
  },
  {
    slug: 'arco',
    name: 'Tiro con l’arco',
    icon: 'bow',
    copy: 'Linee di tiro con bersagli a diverse distanze, con istruttore e attrezzatura.',
  },
  {
    slug: 'carabina',
    name: 'Carabina',
    icon: 'rifle',
    copy: 'Tiro a segno con carabina in poligono attrezzato, sotto la guida dei nostri istruttori.',
  },
]

export const activityBySlug = (slug) => ACTIVITIES.find((a) => a.slug === slug)

export const euro = (cents) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

export const formatShortDate = (iso) => iso.split('-').reverse().join('/')

export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const todayISO = () => toISO(new Date())
