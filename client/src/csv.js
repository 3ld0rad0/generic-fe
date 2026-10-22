import { activityBySlug, formatShortDate, todayISO } from './api.js'

const COLUMNS = [
  ['Data', (b) => formatShortDate(b.date)],
  ['Ora', (b) => b.time],
  ['Attività', (b) => activityBySlug(b.activity)?.name ?? b.activity],
  ['Nome', (b) => b.name],
  ['Email', (b) => b.email],
  ['Telefono', (b) => b.phone],
  ['Partecipanti', (b) => b.players],
  ['Prenotata il', (b) => createdAt(b.created_at)],
]

// SQLite salva l'istante in UTC come "YYYY-MM-DD HH:MM:SS".
function createdAt(value) {
  const d = new Date(`${String(value).replace(' ', 'T')}Z`)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('it-IT')
}

// Le celle che iniziano con = + - @ verrebbero eseguite come formule da Excel/LibreOffice: si neutralizzano,
// salvo i numeri di telefono (+ e sole cifre), che il server normalizza in quel formato.
function cell(value) {
  let text = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(text) && !/^\+\d+$/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function toCsv(bookings) {
  const rows = [COLUMNS.map(([header]) => cell(header)), ...bookings.map((b) => COLUMNS.map(([, get]) => cell(get(b))))]
  // Separatore ; e BOM UTF-8: è ciò che Excel in italiano si aspetta.
  return `\uFEFF${rows.map((r) => r.join(';')).join('\r\n')}\r\n`
}

export function downloadCsv(bookings, name) {
  const url = URL.createObjectURL(new Blob([toCsv(bookings)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}-${todayISO()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
