// SO auto-populates lines from the source SQ on Initiate.
import { test, expect } from '../fixtures/auth'
import { postData } from '../fixtures/api'
import { today } from '../fixtures/test-data'

test.describe('Sales — SO from SQ', () => {
  test('picking an SQ prefills the SO lines from that SQ', async ({ loggedInPage: page, api, ids }) => {
    // 1. Create SQ with two lines
    const sq = await postData<{ id: number; code: string }>(api, '/api/v1/sales/quotations', {
      customer_id:    1,
      quotation_date: today(),
      valid_until:    today(),
      currency_id:    1,
      warehouse_id:   ids.whMain,
      notes:          'E2E SO-from-SQ',
    })
    await postData(api, `/api/v1/sales/quotations/${sq.id}/items`, {
      product_id: ids.cinnStick,
      description: 'SQ line one',
      quantity:   4,
      uom_id:     ids.uomKg,
      unit_price: 500,
    })
    await postData(api, `/api/v1/sales/quotations/${sq.id}/items`, {
      product_id: ids.cinnStick,
      description: 'SQ line two',
      quantity:   6,
      uom_id:     ids.uomKg,
      unit_price: 550,
    })

    // 2. Open SO section, click New Order
    await page.goto('/sales?section=orders')
    await page.getByRole('button', { name: /New (Order|SO)/i }).click()

    // 3. Fill header
    const sqCombo = page.getByLabel('Source Quotation', { exact: false })
    await expect(sqCombo).toBeVisible({ timeout: 15_000 })
    await sqCombo.selectOption({ label: sq.code })
    await page.waitForTimeout(500)
    await page.getByLabel('Customer', { exact: false }).first().selectOption({ index: 1 })
    await page.getByLabel('Order Date', { exact: false }).fill(today())
    await page.getByLabel('Currency', { exact: false }).first().selectOption({ index: 1 })
    await page.getByLabel('Warehouse', { exact: false }).selectOption({ index: 1 })

    // 4. Initiate → lines populate
    await page.getByTestId('doc-save').click()
    await expect(page.getByText('SQ line one')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('SQ line two')).toBeVisible()
  })
})
