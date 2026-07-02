// Auth fixture — extends Playwright's test with a `loggedInPage` and `api`
// fixture. Each spec starts pre-authenticated against the FE (token placed in
// localStorage) AND has an authenticated APIRequestContext for arrange-time
// seeding.
import { type APIRequestContext, type Page } from '@playwright/test'
import { reporterTest } from './reporter'
import { authedContext, login, loadMasterIDs, type MasterIDs } from './api'
import { APP_URL } from './config'

type Fixtures = {
  token: string
  loggedInPage: Page
  api: APIRequestContext
  ids: MasterIDs
}

// Compose on top of the reporter fixture so every test that imports { test }
// from here also gets the snap fixture wired up. Selector helpers use the
// module-level autoSnap() so they can shoot without touching the fixture.
export const test = reporterTest.extend<Fixtures>({
  // 1. Log in once per test and stash the token
  token: async ({}, use) => {
    const t = await login()
    await use(t.access_token)
  },

  // 2. Pre-authenticated FE page — token written to localStorage before any nav
  loggedInPage: async ({ browser, token }, use) => {
    const context = await browser.newContext({ baseURL: APP_URL })
    // Icons are now inline SVGs (Heroicons), but we still load the Inter web
    // font from Google. Abort those requests so tests don't depend on external
    // network reachability — Inter falls back to system sans.
    await context.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort())
    const page = await context.newPage()
    await page.goto('/login')
    await page.evaluate(t => {
      localStorage.setItem('access_token', t)
    }, token)
    await use(page)
    await context.close()
  },

  // 3. Authenticated REST context for arrange-time seeding inside specs
  api: async ({ token }, use) => {
    const ctx = await authedContext(token)
    await use(ctx)
    await ctx.dispose()
  },

  // 4. Common master-data IDs resolved once per spec
  ids: async ({ api }, use) => {
    const m = await loadMasterIDs(api)
    await use(m)
  },
})

export const expect = test.expect
