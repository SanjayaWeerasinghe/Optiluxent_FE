// GRN auto-populates lines from the source PO on Initiate.
//
// Same shape as po-from-pr.spec: create a PO with lines via API, then in
// the FE open New GRN, pick the PO, fill required header fields, click
// Initiate, and confirm the PO's lines land in the GRN's line-items table.
import { test, expect } from '../fixtures/auth'
import { postData } from '../fixtures/api'
import { today, uniq } from '../fixtures/test-data'

test.describe('Procurement — GRN from PO', () => {
  test('picking a PO prefills the GRN lines from that PO', async ({ loggedInPage: page, api, ids }) => {
    // 1. Create a PO with two lines
    const po = await postData<{ id: number; code: string }>(api, '/api/v1/procurement/purchase-orders', {
      supplier_id:  2, // Ceylon Spice Traders
      order_date:   today(),
      currency_id:  1,
      warehouse_id: ids.whMain,
      notes:        'E2E GRN-from-PO test',
    })
    await postData(api, `/api/v1/procurement/purchase-orders/${po.id}/items`, {
      product_id: ids.cinnStick,
      quantity:   10,
      uom_id:     ids.uomKg,
      unit_price: 320,
    })
    await postData(api, `/api/v1/procurement/purchase-orders/${po.id}/items`, {
      product_id: ids.cinnStick,
      quantity:   5,
      uom_id:     ids.uomKg,
      unit_price: 350,
    })
    // Confirm the PO so it isn't stuck in DRAFT (typical workflow)
    await api.post(`/api/v1/procurement/purchase-orders/${po.id}/confirm`)

    // 2. Open the GRN section and start a new GRN
    await page.goto('/procurement?section=grn')
    await page.getByRole('button', { name: /New GRN/i }).click()

    // 3. Fill header: pick the PO + required fields
    const poCombo = page.getByLabel('Purchase Order', { exact: false }).first()
    await expect(poCombo).toBeVisible({ timeout: 15_000 })
    await poCombo.selectOption({ label: po.code })
    await page.waitForTimeout(500)
    // Pick a GRN Type (With Purchase Order)
    await page.getByLabel('GRN Type', { exact: false }).selectOption({ label: 'WITH_PO – With Purchase Order' })
    await page.getByLabel('Supplier', { exact: false }).selectOption({ index: 1 })
    await page.getByLabel('Receipt Date', { exact: false }).fill(today())
    await page.getByLabel('Warehouse', { exact: false }).selectOption({ index: 1 })

    // 4. Initiate — should prefill lines from the PO
    await page.getByTestId('doc-save').click()

    // 5. Both PO lines should appear as GRN lines (matching product cells)
    // The product resolves via LookupCell → "CINN-STCK – Ceylon Cinnamon Sticks"
    await expect(page.getByText('CINN-STCK', { exact: false }).first()).toBeVisible({ timeout: 15_000 })
    // At least two data rows
    const productCells = page.locator('td', { hasText: /CINN-STCK/i })
    await expect(productCells).toHaveCount(2, { timeout: 10_000 })
  })
})
