import { expect, test } from '@playwright/test'

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'e2e-password'
const CONFIRMED = 'Ci vediamo al poligono!'
const STEP_1 = 'Scegli attività, data e ora'
const BOXES =
  '.feature-card, .step, .story-image, .map-placeholder, .calendar, .slots-panel, .personal-form, .summary-card, ' +
  '.admin-panel, .dashboard-stats > div, .login-card'
let seq = 0
let headers

function futureDate(days = 3) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function createSlot(request, { date = futureDate(), time = '10:00', activity = 'paintball' } = {}) {
  const r = await request.post('/api/admin/slots', { headers, data: { activity, date, time, priceCents: 2500 } })
  expect(r.status()).toBe(201)
  return (await r.json()).id
}

async function bookings(request) {
  return (await request.get('/api/admin/bookings', { headers })).json()
}

// Un IP diverso per utente (X-Forwarded-For è accettato da 127.0.0.1) per non incappare nel limite per IP.
async function newUser(browser) {
  const context = await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-For': `10.77.0.${++seq}` } })
  return context.newPage()
}

async function openDetails(page, time = '10:00') {
  await page.goto('/prenota')
  await page.getByRole('button', { name: new RegExp(time) }).click()
  await page.getByRole('button', { name: 'Continua' }).click()
  await expect(page.getByRole('heading', { name: 'I tuoi dati' })).toBeVisible()
}

async function fillDetails(page) {
  const n = ++seq
  await page.getByLabel('Nome e cognome').fill('Utente Test')
  await page.getByLabel('Email').fill(`e2e${n}@stress.it`)
  await page.getByLabel('Telefono').fill(`333 ${String(n).padStart(7, '0')}`)
}

const confirm = (page) => page.getByRole('button', { name: 'Conferma prenotazione' })
const step1 = (page) => page.getByRole('heading', { name: STEP_1 })

async function layoutIssues(page) {
  return page.evaluate((selector) => {
    const vw = document.documentElement.clientWidth
    const issues = []
    if (document.documentElement.scrollWidth > vw) issues.push(`overflow orizzontale ${document.documentElement.scrollWidth}px`)
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect()
      if (!r.width) continue
      if (r.left < -1 || r.right > vw + 1) issues.push(`${el.className}: esce in larghezza`)
      if (r.height > window.innerHeight) issues.push(`${el.className}: alto ${Math.round(r.height)}px`)
    }
    return issues
  }, BOXES)
}

test.beforeEach(async ({ request }) => {
  const r = await request.post('/api/admin/login', { data: { password: ADMIN_PASSWORD } })
  headers = { Authorization: `Bearer ${(await r.json()).token}` }
  for (const s of await (await request.get('/api/slots?from=1970-01-01')).json()) {
    await request.delete(`/api/admin/slots/${s.id}`, { headers })
  }
})

test('12 · stato obsoleto: lo slot viene cancellato o prenotato mentre l’utente compila i dati', async ({ browser, request }) => {
  const removed = await createSlot(request, { time: '10:00' })
  const taken = await createSlot(request, { time: '11:00' })
  const page = await newUser(browser)

  await openDetails(page, '10:00')
  await fillDetails(page)
  await request.delete(`/api/admin/slots/${removed}`, { headers })
  await confirm(page).click()
  await expect(page.getByRole('alert')).toContainText('Sessione non trovata')
  await expect(step1(page)).toBeVisible()

  await page.getByRole('button', { name: /11:00/ }).click()
  await page.getByRole('button', { name: 'Continua' }).click()
  await fillDetails(page)
  const other = { slotId: taken, players: 1, name: 'Altro Utente', email: 'altro@stress.it', phone: '3339990001' }
  expect((await request.post('/api/bookings', { data: other, headers: { 'X-Forwarded-For': '10.78.0.1' } })).status()).toBe(201)
  await confirm(page).click()
  await expect(page.getByRole('alert')).toContainText('già prenotata')
  await expect(step1(page)).toBeVisible()
  await expect(page.getByRole('button', { name: /11:00/ })).toHaveCount(0)
})

test('31 · due browser sullo stesso slot: uno conferma, l’altro torna alla scelta con un errore', async ({ browser, request }) => {
  await createSlot(request)
  const users = [await newUser(browser), await newUser(browser)]
  for (const page of users) {
    await openDetails(page)
    await fillDetails(page)
  }
  await Promise.all(users.map((page) => confirm(page).click()))
  const outcome = async (page) => {
    const ok = page.getByRole('heading', { name: CONFIRMED })
    await expect(ok.or(page.getByRole('alert'))).toBeVisible()
    return (await ok.isVisible()) ? 'ok' : 'ko'
  }
  const results = await Promise.all(users.map(outcome))
  expect(results.toSorted()).toEqual(['ko', 'ok'])
  const loser = users[results.indexOf('ko')]
  await expect(loser.getByRole('alert')).toContainText('già prenotata')
  await expect(step1(loser)).toBeVisible()
  await expect(loser.getByRole('button', { name: /10:00/ })).toHaveCount(0)
  expect(await bookings(request)).toHaveLength(1)
})

test('32 · doppio click e invio con Enter durante l’invio: una sola richiesta', async ({ browser, request }) => {
  await createSlot(request)
  const page = await newUser(browser)
  await openDetails(page)
  await fillDetails(page)
  let posts = 0
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/api/bookings')) posts++
  })
  await page.route('**/api/bookings', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await route.continue()
  })
  await confirm(page).dblclick()
  await expect(page.getByRole('button', { name: 'Invio in corso...' })).toBeDisabled()
  await page.getByLabel('Email').press('Enter')
  await expect(page.getByRole('heading', { name: CONFIRMED })).toBeVisible()
  expect(posts).toBe(1)
  expect(await bookings(request)).toHaveLength(1)
})

test('33 · rete assente durante l’invio: errore chiaro, dati conservati, retry senza duplicati', async ({ browser, request }) => {
  await createSlot(request)
  const page = await newUser(browser)
  await openDetails(page)
  await fillDetails(page)
  const email = await page.getByLabel('Email').inputValue()
  await page.route('**/api/bookings', (route) => route.abort('internetdisconnected'))
  await confirm(page).click()
  await expect(page.getByRole('alert')).toHaveText('Impossibile contattare il server')
  await expect(page.getByLabel('Email')).toHaveValue(email)
  await page.unroute('**/api/bookings')
  await confirm(page).click()
  await expect(page.getByRole('heading', { name: CONFIRMED })).toBeVisible()
  expect(await bookings(request)).toHaveLength(1)
})

test('33b · risposta persa dopo il salvataggio: il retry conferma la stessa prenotazione', async ({ browser, request }) => {
  await createSlot(request)
  const page = await newUser(browser)
  await openDetails(page)
  await fillDetails(page)
  await page.route('**/api/bookings', async (route) => {
    await route.fetch()
    await route.abort('connectionreset')
  })
  await confirm(page).click()
  await expect(page.getByRole('alert')).toHaveText('Impossibile contattare il server')
  await page.unroute('**/api/bookings')
  await confirm(page).click()
  await expect(page.getByRole('heading', { name: CONFIRMED })).toBeVisible()
  expect(await bookings(request)).toHaveLength(1)
})

test('34 · refresh e back nei passi 2 e 3: nessuna prenotazione doppia', async ({ browser, request }) => {
  await createSlot(request, { time: '10:00' })
  await createSlot(request, { time: '11:00' })
  const page = await newUser(browser)

  await openDetails(page, '10:00')
  await fillDetails(page)
  await page.reload()
  await expect(step1(page)).toBeVisible()
  expect(await bookings(request)).toHaveLength(0)

  await openDetails(page, '10:00')
  await fillDetails(page)
  await confirm(page).click()
  await expect(page.getByRole('heading', { name: CONFIRMED })).toBeVisible()
  await page.reload()
  await expect(step1(page)).toBeVisible()
  await page.goBack()
  await page.goForward()
  expect(await bookings(request)).toHaveLength(1)

  await page.goto('/')
  await openDetails(page, '11:00')
  await page.goBack()
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/)
})

test('35 · schermo 1366x768: nessun overflow né riquadri più alti dello schermo', async ({ page, request }) => {
  await createSlot(request, { time: '10:00' })
  await createSlot(request, { time: '11:30' })
  const issues = {}
  const check = async (name) => {
    issues[name] = await layoutIssues(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `test-results/1366x768-${name}.png`, fullPage: true, animations: 'disabled' })
  }

  await page.goto('/')
  await check('home')
  await page.goto('/prenota')
  await expect(page.getByRole('button', { name: /10:00/ })).toBeVisible()
  await check('prenota-passo1')
  await page.getByRole('button', { name: /10:00/ }).click()
  await page.getByRole('button', { name: 'Continua' }).click()
  await check('prenota-passo2')
  await page.goto('/admin')
  await check('admin-login')
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await check('admin-prenotazioni')
  await page.getByRole('tab', { name: /Sessioni/ }).click()
  await check('admin-sessioni')
  expect(issues).toEqual(Object.fromEntries(Object.keys(issues).map((k) => [k, []])))
})

test('36 · sessione admin scaduta: ritorno al login senza loop né scritture parziali', async ({ page, request }) => {
  await page.goto('/admin')
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await page.getByRole('tab', { name: /Sessioni/ }).click()
  const date = futureDate(10)
  await page.getByLabel('Data', { exact: true }).first().fill(date)
  await page.getByLabel('Ora', { exact: true }).fill('18:00')

  await page.evaluate(() => sessionStorage.setItem('adminToken', '1000.firma-non-valida'))
  let adminCalls = 0
  page.on('request', (r) => {
    if (r.url().includes('/api/admin/')) adminCalls++
  })
  await page.getByRole('button', { name: 'Aggiungi turni' }).click()
  await expect(page.getByRole('heading', { name: 'Accesso gestore' })).toBeVisible()
  await page.waitForTimeout(1500)
  expect(adminCalls).toBe(1)
  expect(await page.evaluate(() => sessionStorage.getItem('adminToken'))).toBeNull()
  const slots = await (await request.get('/api/slots?from=1970-01-01')).json()
  expect(slots.filter((s) => s.date === date)).toHaveLength(0)

  // Dopo il nuovo accesso il modulo riparte vuoto: i dati inseriti prima della scadenza vanno persi.
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.getByRole('tab', { name: /Sessioni/ }).click()
  await expect(page.getByLabel('Ora', { exact: true })).toHaveValue('')
})

test('admin · lo storico viene scaricato solo quando un filtro lo richiede', async ({ page }) => {
  const current = page.waitForRequest((r) => r.url().includes(`/api/admin/bookings?from=${futureDate(0)}`))
  await page.goto('/admin')
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await current
  const history = page.waitForRequest((r) => r.url().includes('/api/admin/bookings?from=1970-01-01'))
  await page.getByLabel('Mostra').selectOption('past')
  await history
})
