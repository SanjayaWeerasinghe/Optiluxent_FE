// Central config — read from env so it stays in sync with the running stack.
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000'
export const APP_URL = process.env.E2E_APP_URL ?? 'http://localhost:5173'
export const EMAIL   = process.env.E2E_EMAIL   ?? 'admin@optiluxent.com'
export const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin@1234'

export const FINDINGS_PATH = 'e2e/PLAYWRIGHT_FINDINGS.md'
