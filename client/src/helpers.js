import { useEffect } from 'react'

// Frecce nei calendari: sposta il fuoco tra i giorni selezionabili (±1 giorno, ±7 giorni).
export function gridKeys(e) {
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
  if (!step) return
  const days = [...e.currentTarget.querySelectorAll('button')]
  const from = days.indexOf(document.activeElement)
  if (from < 0) return
  e.preventDefault()
  for (let i = from + step; i >= 0 && i < days.length; i += step) {
    if (!days[i].disabled) {
      days[i].focus()
      return
    }
  }
}

const SITE_NAME = 'Cardinali Poligono'
const DEFAULT_DESCRIPTION =
  'Paintball, tiro con l’arco e carabina a Milano: scegli l’attività, il giorno e l’orario e prenota online la tua sessione.'

export function usePageMeta({ title, description = DEFAULT_DESCRIPTION, noindex = false }) {
  useEffect(() => {
    const full = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Paintball, arco e carabina a Milano`
    document.title = full
    const set = (selector, value) => document.head.querySelector(selector)?.setAttribute('content', value)
    set('meta[name="description"]', description)
    set('meta[property="og:title"]', full)
    set('meta[property="og:description"]', description)
    set('meta[name="robots"]', noindex ? 'noindex,nofollow' : 'index,follow')
  }, [title, description, noindex])
}
