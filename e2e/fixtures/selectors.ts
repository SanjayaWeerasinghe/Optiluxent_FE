// Page-object-ish helpers — shrink the per-spec noise of "click sidebar, click
// new, fill field, save, click confirm".
//
// Each helper calls `autoSnap(...)` at meaningful moments so specs that use
// these helpers automatically produce a screenshot storyline via the reporter
// fixture. Specs that want extra shots can pull the `snap` fixture directly.
import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'
import { autoSnap } from './reporter'

export type ModuleKey = 'procurement' | 'sales' | 'inventory' | 'manufacturing' | 'admin'

/** Navigate to a module page on a specific section: /procurement?section=grn */
export async function gotoSection(page: Page, module: ModuleKey, section: string) {
  await page.goto(`/${module}?section=${section}`)
  // Wait for the lazy section chunk to mount — Suspense fallback shows "Loading section…"
  // We then wait for either the search input or the "New" button to render.
  await page.locator('button:has-text("New"), input[placeholder*="Search"]').first().waitFor({ timeout: 15_000 })
  await autoSnap(page,`section ${module}/${section} loaded`)
}

/** Click "New <X>" toolbar button. The Button component prefixes an icon glyph
 * ("add") to the children, so we just match any button containing "New ". */
export async function clickNewRecord(page: Page) {
  const newBtn = page.locator('button', { hasText: /New\s/ }).first()
  await newBtn.click()
  await expect(page.getByTestId('doc-modal')).toBeVisible()
  await autoSnap(page,'new record modal opened')
}

/** Fill a header form field located by the `field-<key>` data-testid wrapper. */
export async function fillField(page: Page, key: string, value: string | number) {
  const wrapper = page.getByTestId(`field-${key}`)
  // Try input first, then textarea, then select
  const inp = wrapper.locator('input, textarea, select').first()
  await inp.fill(String(value)).catch(async () => {
    // Select boxes don't support fill() — fall back to selectOption
    await inp.selectOption(String(value))
  })
}

export async function selectField(page: Page, key: string, value: string | number) {
  const wrapper = page.getByTestId(`field-${key}`)
  const sel = wrapper.locator('select').first()
  await sel.selectOption(String(value))
}

/** Same as fillField but for a line-item form (Add Line form). */
export async function fillLineField(page: Page, key: string, value: string | number) {
  const wrapper = page.getByTestId(`line-field-${key}`)
  const inp = wrapper.locator('input, textarea, select').first()
  await inp.fill(String(value)).catch(async () => {
    await inp.selectOption(String(value))
  })
}

export async function selectLineField(page: Page, key: string, value: string | number) {
  const wrapper = page.getByTestId(`line-field-${key}`)
  await wrapper.locator('select').first().selectOption(String(value))
}

/** Add a line: open Add form, fill fields, click "Add to Lines" */
export async function addLine(
  page: Page,
  fields: Record<string, string | number>,
  selects: Record<string, string | number> = {},
) {
  await page.getByTestId('line-add').click()
  for (const [k, v] of Object.entries(fields)) await fillLineField(page, k, v)
  for (const [k, v] of Object.entries(selects)) await selectLineField(page, k, v)
  await autoSnap(page,'line form filled')
  await page.getByTestId('line-add-confirm').click()
  await autoSnap(page,'line added to grid')
}

export async function saveDoc(page: Page) {
  await autoSnap(page,'modal filled before save')
  await page.getByTestId('doc-save').click()
  // Modal closes on success. If it stays open, the footer error message tells
  // us what went wrong — surface that into the assertion message.
  try {
    await expect(page.getByTestId('doc-modal')).not.toBeVisible({ timeout: 15_000 })
    await autoSnap(page,'after save')
  } catch (e) {
    // Pull the modal footer error (matches "text-error" + label-mono inline error)
    const errMsg = await page.locator('.text-error.flex.items-center').first().textContent().catch(() => null)
    const bodyText = await page.getByTestId('doc-modal').textContent().catch(() => null)
    await autoSnap(page,'save failed')
    throw new Error(`Save did not close modal.\nFooter error: ${errMsg}\nModal body sample: ${bodyText?.slice(0, 400)}`)
  }
}

export async function runWorkflow(page: Page, action: string) {
  await autoSnap(page,`before workflow ${action}`)
  await page.getByTestId(`workflow-${action}`).click()
  try {
    await expect(page.getByTestId('doc-modal')).not.toBeVisible({ timeout: 15_000 })
    await autoSnap(page,`after workflow ${action}`)
  } catch (e) {
    const errMsg = await page.locator('.text-error.flex.items-center').first().textContent().catch(() => null)
    await autoSnap(page,`workflow ${action} failed`)
    throw new Error(`Workflow action "${action}" did not close the modal. Footer error: ${errMsg ?? '(none)'}`)
  }
}

/** Open a doc by its code (clicks the row whose cell text equals the code). */
export async function openDocByCode(page: Page, code: string) {
  await page.getByRole('cell', { name: code, exact: true }).click()
  await expect(page.getByTestId('doc-modal')).toBeVisible()
  await autoSnap(page,`opened ${code}`)
}

/** Find a list row by code and return its locator (useful for asserting status badges). */
export function rowByCode(page: Page, code: string): Locator {
  return page.locator('tr', { has: page.getByRole('cell', { name: code, exact: true }) })
}

/** Assert a row exists in the current list with a given status badge. */
export async function expectRowStatus(page: Page, code: string, status: string) {
  await expect(rowByCode(page, code)).toContainText(status)
}
