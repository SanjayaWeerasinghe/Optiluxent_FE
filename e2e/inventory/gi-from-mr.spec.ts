// GI auto-populates lines from a linked MR on Initiate.
import { test, expect } from '../fixtures/auth'
import { postData } from '../fixtures/api'
import { today } from '../fixtures/test-data'

test.describe('Inventory — GI from MR', () => {
  test('picking an MR prefills the GI lines from that MR', async ({ loggedInPage: page, api, ids }) => {
    // 1. Create + populate + approve a MR (must be non-DRAFT to be issued from)
    const mr = await postData<{ id: number; code: string }>(api, '/api/v1/inventory/material-requests', {
      requested_by: 1,
      warehouse_id: ids.whMain,
      needed_date:  today(),
      notes:        'E2E GI-from-MR',
    })
    await postData(api, `/api/v1/inventory/material-requests/${mr.id}/items`, {
      product_id:    ids.cinnStick,
      requested_qty: 12,
      uom_id:        ids.uomKg,
      notes:         'MR line one',
    })
    await postData(api, `/api/v1/inventory/material-requests/${mr.id}/items`, {
      product_id:    ids.cinnStick,
      requested_qty: 8,
      uom_id:        ids.uomKg,
      notes:         'MR line two',
    })
    await api.post(`/api/v1/inventory/material-requests/${mr.id}/submit`)
    await api.post(`/api/v1/inventory/material-requests/${mr.id}/approve`)

    // 2. Open GI section, New Issue
    await page.goto('/inventory?section=issues')
    await page.getByRole('button', { name: /New Issue/i }).click()

    // 3. Fill header with the MR picker
    const mrCombo = page.getByLabel('Source Material Request', { exact: false })
    await expect(mrCombo).toBeVisible({ timeout: 15_000 })
    await mrCombo.selectOption({ label: mr.code })
    // Give the prefill fetch a moment to complete before Initiate so we're
    // not racing the doc create against the source-line fetch.
    await page.waitForTimeout(500)
    await page.getByLabel('Issue Date', { exact: false }).fill(today())
    await page.getByLabel('Warehouse', { exact: false }).selectOption({ index: 1 })

    // 4. Initiate → GI lines mirror the MR lines (2 rows carrying the MR's product)
    await page.getByTestId('doc-save').click()
    const productCells = page.locator('td', { hasText: /CINN-STCK/i })
    await expect(productCells).toHaveCount(2, { timeout: 20_000 })
  })
})
