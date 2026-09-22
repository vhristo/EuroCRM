// Browser checks for the company switcher.
//
//   pnpm verify:ui
//
// Requires playwright, which is deliberately not a dependency of this project:
//
//   npm i -D playwright && npx playwright install chromium
//
// Configure with BASE_URL (default http://127.0.0.1:3005) and SHOTS (default
// /tmp/uishots), where a screenshot of each step is written.
//
// The assertion that matters most is step 6. RTK Query keys its cache on
// endpoint plus arguments with no identity component, so without an explicit
// cache reset a switched session is served the previous company's rows until
// each query refetches. That is a display-only leak — the server never returns
// another company's data — but it is indistinguishable from a real one to
// anybody looking at the screen.

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3005'
const SHOTS = process.env.SHOTS ?? '/tmp/uishots'
const RUN = Date.now()
const EMAIL = `verify-ui-${RUN}@example.invalid`
const PASSWORD = 'password123'
const CO1 = `Alpha ${RUN}`
const CO2 = `Beta ${RUN}`

let pass = 0
let fail = 0
const ok = (m) => { console.log(`  PASS  ${m}`); pass++ }
const no = (m) => { console.log(`  FAIL  ${m}`); fail++ }
const chk = (m, got, want) =>
  String(got) === String(want) ? ok(`${m} (${got})`) : no(`${m} (got '${got}', want '${want}')`)

mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` })

// Surface client-side crashes rather than letting them masquerade as failed
// assertions further down.
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

console.log(`run ${RUN} against ${BASE}\n`)

try {
  console.log('=== 1. Register ===')
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' })
  await page.getByLabel('First name').fill('Ui')
  await page.getByLabel('Last name').fill('Tester')
  await page.getByLabel('Organisation name').fill(CO1)
  await page.getByLabel('Work email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /create account|sign up|register/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  ok('registered and landed on the dashboard')
  await shot('01-dashboard')

  console.log('=== 2. The top bar names the active company ===')
  const bar = page.locator('header')
  await bar.getByText(CO1, { exact: true }).waitFor({ timeout: 8000 })
  ok(`top bar shows "${CO1}"`)

  console.log('=== 3. A contact in the first company ===')
  await page.goto(`${BASE}/contacts`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /add contact/i }).click()
  await page.getByLabel(/first name/i).first().fill('Grid')
  await page.getByLabel(/last name/i).first().fill('Row')
  await page.getByRole('button', { name: /^(create|save)/i }).click()
  await page.waitForTimeout(1500)
  await shot('02-contacts-company-one')
  chk('rows in the first company', await page.locator('.MuiDataGrid-row').count(), 1)

  console.log('=== 4. The account menu ===')
  await page.getByRole('button', { name: /account menu/i }).click()
  await page.waitForTimeout(400)
  await shot('03-account-menu')
  const menu = page.locator('.MuiMenu-paper')
  chk('the first company is listed', await menu.getByText(CO1, { exact: true }).count(), 1)
  chk('there is a create action', await menu.getByText('Create company').count(), 1)

  console.log('=== 5. Create a second company ===')
  await menu.getByText('Create company').click()
  await page.getByLabel('Company name').waitFor({ timeout: 5000 })
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.waitForTimeout(600)
  chk('an empty name is rejected', (await page.getByText('Company name is required').count()) > 0, true)
  await shot('04-create-dialog-validation')
  await page.getByLabel('Company name').fill(CO2)
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await bar.getByText(CO2, { exact: true }).waitFor({ timeout: 8000 })
  ok(`created it and switched in; top bar shows "${CO2}"`)
  await shot('05-dashboard-company-two')

  console.log('=== 6. The cache must not survive the switch ===')
  await page.goto(`${BASE}/contacts`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await shot('06-contacts-company-two')
  chk('rows in the second company', await page.locator('.MuiDataGrid-row').count(), 0)
  chk("the first company's row did not leak", await page.getByText('Grid').count(), 0)

  console.log('=== 7. Switch back ===')
  await page.getByRole('button', { name: /account menu/i }).click()
  await page.waitForTimeout(400)
  await page.locator('.MuiMenu-paper').getByText(CO1, { exact: true }).click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await bar.getByText(CO1, { exact: true }).waitFor({ timeout: 8000 })
  ok('back in the first company')
  await page.goto(`${BASE}/contacts`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  chk('its rows are back', await page.locator('.MuiDataGrid-row').count(), 1)
  await shot('07-contacts-company-one-again')

  console.log('=== 8. A reload keeps both the session and the company ===')
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  chk('still on the contacts page', new URL(page.url()).pathname, '/contacts')
  await bar.getByText(CO1, { exact: true }).waitFor({ timeout: 8000 })
  ok('the active company survived the reload')
  await shot('08-after-reload')

  console.log('=== 9. Settings, Companies tab ===')
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.getByRole('tab', { name: 'Companies' }).click()
  await page.waitForTimeout(800)
  await shot('09-settings-companies')
  // Scoped to the card: the sidebar navigation is also made of list items.
  chk('both companies listed', await page.locator('.MuiCard-root .MuiListItem-root').count(), 2)
  chk('a switch action on the inactive one', await page.getByRole('button', { name: /^switch$/i }).count(), 1)
  chk('an active marker on the current one', await page.getByText('Active', { exact: true }).count(), 1)

  console.log('=== 10. Log out ===')
  await page.getByRole('button', { name: /account menu/i }).click()
  await page.waitForTimeout(400)
  await page.locator('.MuiMenu-paper').getByText('Logout').click()
  await page.waitForURL('**/login', { timeout: 15000 })
  ok('returned to the login page')
  await shot('10-login')
} catch (e) {
  no(`threw: ${e.message.split('\n')[0]}`)
  await shot('99-failure')
} finally {
  if (errors.length) {
    console.log('\n  client-side errors:')
    for (const e of errors.slice(0, 5)) console.log('   ', e.split('\n')[0])
  }
  console.log(`\n================ ${pass} passed, ${fail} failed ================`)
  console.log(`screenshots in ${SHOTS}`)
  console.log(`\nleaves behind the account ${EMAIL}; scripts/verify/multi-company.sh`)
  console.log('cleans accounts matching its own run id, not this one.')
  await browser.close()
  process.exit(fail === 0 ? 0 : 1)
}
