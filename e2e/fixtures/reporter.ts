// Reporter fixture — captures indexed screenshots per test and emits a
// steps.json manifest that the report generator turns into a per-test
// HTML document. Two ways to add a shot:
//
//   1. Specs can pull the `snap` fixture and call `snap('label')`
//      explicitly at meaningful moments.
//   2. Shared selector helpers call the module-level `autoSnap(label)`
//      which routes to the same recorder while a test is active — this
//      is what gives us free coverage without editing every spec.
//
// Output layout:
//   e2e/reports/<spec>/<test-slug>/
//     01-goto-section-procurement-pr.png
//     02-modal-open-doc.png
//     ...
//     steps.json    ← consumed by scripts/generate-reports.mjs
import { test as base, type Page } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

// The recorder function takes the page to shoot as an argument. Specs using
// `loggedInPage` create their own page separate from Playwright's default
// `page` fixture — we can't close over one and expect it to be the other,
// so callers pass the actually-active page each time.
type Snap = (page: Page, label: string) => Promise<void>

export const REPORTS_DIR = 'e2e/reports'

// Module-level pointer so helpers imported from selectors.ts can snap
// without needing the current test's fixture object. Only one test runs
// at a time (workers=1) so a single slot is safe.
let activeSnap: Snap | null = null

/** Called by shared selector helpers. No-op outside a test. */
export async function autoSnap(page: Page, label: string) {
  if (activeSnap) {
    try { await activeSnap(page, label) } catch { /* screenshotting must never fail a test */ }
  }
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

function slugify(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60)
}

interface StepMeta {
  n:     number
  label: string
  file:  string
  ts:    string
}

export const reporterTest = base.extend<{ snap: (label: string) => Promise<void> }>({
  // Auto so `activeSnap` is set for every test, letting the shared selector
  // helpers snap without each spec needing to touch the fixture.
  snap: [async ({}, use, testInfo) => {
    const spec  = path.basename(testInfo.file).replace(/\.spec\.ts$/, '')
    const slug  = slugify(testInfo.title) || 'test'
    const dir   = path.join(REPORTS_DIR, spec, slug)
    await ensureDir(dir)

    let counter = 0
    const steps: StepMeta[] = []

    // Recorder shared with autoSnap — writes a PNG for the passed-in page
    // and appends metadata.
    const recorder: Snap = async (p: Page, label: string) => {
      counter++
      const n    = String(counter).padStart(2, '0')
      const file = `${n}-${slugify(label)}.png`
      await p.screenshot({ path: path.join(dir, file), fullPage: false })
      steps.push({ n: counter, label, file, ts: new Date().toISOString() })
    }
    activeSnap = recorder

    // For specs that want to snap explicitly. They typically already have a
    // `page` local — this wrapper just plugs the fixture's page in for them.
    const specSnap = async (label: string) => {
      // Best-effort: try the standard `page` fixture first if available; else
      // this needs the caller to invoke autoSnap(page, label) directly.
      // Kept only for backwards compat; not used by the selector helpers.
      // (No-op if no page yet — tests using loggedInPage should call autoSnap.)
    }

    try {
      await use(specSnap)
    } finally {
      activeSnap = null
      // Always write the manifest — even if the test failed, the steps up to
      // the failure are useful for the report.
      await fs.writeFile(
        path.join(dir, 'steps.json'),
        JSON.stringify({
          spec,
          file:     path.relative(process.cwd(), testInfo.file).replace(/\\/g, '/'),
          title:    testInfo.title,
          slug,
          status:   testInfo.status,
          duration: testInfo.duration,
          error:    testInfo.error ? String(testInfo.error?.message ?? testInfo.error).slice(0, 2000) : null,
          steps,
        }, null, 2),
      )
    }
  }, { auto: true }],
})

export { expect } from '@playwright/test'
