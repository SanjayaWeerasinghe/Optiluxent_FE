// PO auto-populates lines from the source PR when a PR is picked.
//
// 1. Create a PR with 2 lines via API (approved)
// 2. Open the PO section, click "New PO"
// 3. Pick the PR in the Source Purchase Request dropdown
// 4. The line-items table should immediately show the 2 PR lines
import { test, expect } from '../fixtures/auth'
import { postData } from '../fixtures/api'
import { today, uniq } from '../fixtures/test-data'

test.describe('Procurement — PO from PR', () => {
  test('picking a PR prefills the PO lines from that PR', async ({ loggedInPage: page, api, ids }) => {
    // 1. Create + populate a PR
    const pr = await postData<{ id: number; code: string }>(api, '/api/v1/procurement/purchase-requests', {
      request_date:  today(),
      required_date: today(),
      notes:         'E2E PO-from-PR test',
    })
    await postData(api, `/api/v1/procurement/purchase-requests/${pr.id}/items`, {
      product_id:      ids.cinnStick,
      description:     'Line one',
      quantity:        5,
      uom_id:          ids.uomKg,
      estimated_price: 200,
    })
    await postData(api, `/api/v1/procurement/purchase-requests/${pr.id}/items`, {
      product_id:      ids.cinnStick,
      description:     'Line two',
      quantity:        3,
      uom_id:          ids.uomKg,
      estimated_price: 250,
    })
    // Submit + approve so the PR isn't in DRAFT (not required for prefill but
    // matches the real workflow).
    await api.post(`/api/v1/procurement/purchase-requests/${pr.id}/submit`)
    await api.post(`/api/v1/procurement/purchase-requests/${pr.id}/approve`)

    // 2. Open PO section, click "New PO"
    await page.goto('/procurement?section=po')
    await page.getByRole('button', { name: /New PO/i }).click()

    // 3. Fill header including the PR picker. Only header fields are visible
    // in create mode; the line-items table is hidden until Initiate.
    const prCombo = page.getByLabel('Source Purchase Request', { exact: false })
    await expect(prCombo).toBeVisible({ timeout: 15_000 })
    await prCombo.selectOption({ label: pr.code })
    // Let the prefill fetch settle before we submit.
    await page.waitForTimeout(500)

    // Fill the required PO fields
    await page.getByLabel('Supplier', { exact: false }).first().selectOption({ index: 1 })
    await page.getByLabel('Order Date', { exact: false }).fill(today())
    await page.getByLabel('Currency', { exact: false }).first().selectOption({ index: 1 })
    await page.getByLabel('Warehouse', { exact: false }).selectOption({ index: 1 })

    // 4. Click Initiate — this saves the header and transitions the modal
    // to edit mode, at which point the line-items table appears and the PR
    // prefill fires.
    await page.getByTestId('doc-save').click()

    // 5. Lines from the PR should now populate the line-items table.
    await expect(page.getByText('Line one')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Line two')).toBeVisible()
  })
})
