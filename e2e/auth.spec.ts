// Auth basics — login redirects to dashboard, fixture-based auth works on
// protected routes.
import { test, expect } from './fixtures/auth'
import { EMAIL, PASSWORD } from './fixtures/config'

test.describe('Auth', () => {
  test('login with valid creds lands on dashboard', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: 'http://localhost:5173' })
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort())
    const page = await ctx.newPage()
    // Surface console errors and failed network requests in the test output —
    // makes auth bugs (CORS, env var, etc.) easy to spot.
    page.on('console', msg => { if (msg.type() === 'error') console.log('[browser]', msg.text()) })
    page.on('requestfailed', req => console.log('[failed]', req.method(), req.url(), '-', req.failure()?.errorText))

    await page.goto('/login')

    await page.locator('#email').fill(EMAIL)
    await page.locator('#password').fill(PASSWORD)
    // Submit the form via the button[type=submit] — using a CSS selector avoids
    // the accessible-name issue with Material icon glyphs appearing in the role
    // name of the button.
    await page.locator('button[type="submit"]').click()

    // LoginPage calls navigate('/') on success, so URL should no longer be /login.
    // 45s gives the FE room to cold-load on a fresh Vite process.
    await expect(page).not.toHaveURL(/\/login/, { timeout: 45_000 })
    await ctx.close()
  })

  test('logged-in fixture works for protected routes', async ({ loggedInPage }) => {
    await loggedInPage.goto('/procurement?section=pr')
    // The procurement page renders an <h1> with the section label. There's
    // also a brand <h1> in the sidebar, so target the heading by name.
    await expect(loggedInPage.getByRole('heading', { name: 'Purchase Requests', exact: true })).toBeVisible()
  })
})
