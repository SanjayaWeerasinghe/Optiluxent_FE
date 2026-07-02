import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config: drives the running Vite dev server (5173) against the local API (3000).
 * Runs headed by default for visual verification, single worker to keep flows deterministic
 * and easy to watch. Use `npm run test:e2e -- --headed=false` for CI.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5173',
    headless: false,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { slowMo: 200 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
