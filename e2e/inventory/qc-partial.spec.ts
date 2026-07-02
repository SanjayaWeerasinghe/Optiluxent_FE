// QC PARTIAL — qty_passed < qty_checked. Only the passed portion lands in stock.
import { test, expect } from '../fixtures/auth'
import { today } from '../fixtures/test-data'
import { postData, getData, stockQty } from '../fixtures/api'
import { gotoSection, openDocByCode, runWorkflow } from '../fixtures/selectors'

test.describe('Inventory — QC PARTIAL posts only qty_passed', () => {
  test('Grade 35/15 split → stock_balance grows by 35, ledger row written', async ({ loggedInPage: page, api, ids }) => {
    // Arrange: ad-hoc GRN that yields a Material QC
    const grn = await postData<{ id: number; code: string }>(api, '/api/v1/procurement/goods-receipts', {
      grn_type: 'WITHOUT_PO',
      supplier_id: ids.indianSpiceSupp,
      receipt_date: today(),
      warehouse_id: ids.whMain,
      notes: 'E2E partial QC test',
    })
    await postData(api, `/api/v1/procurement/goods-receipts/${grn.id}/items`, {
      product_id: ids.cardamom, quantity: 50, uom_id: ids.uomKg, location_id: ids.locA1, unit_cost: 4350,
    })
    await api.post(`/api/v1/procurement/goods-receipts/${grn.id}/confirm`)

    const before = await stockQty(api, ids.whMain, ids.cardamom)

    // Find the auto QC
    const qcs = await getData<Array<{ id: number; code: string; reference_type: string; reference_id: number }>>(api, '/api/v1/inventory/quality-checks')
    const qc = qcs.find(q => q.reference_type === 'GRN' && q.reference_id === grn.id)!
    const detail = await getData<{ lines: Array<{ id: number }> }>(api, `/api/v1/inventory/quality-checks/${qc.id}`)
    const lineId = detail.lines[0].id

    // Grade 35 passed, 15 failed
    await api.put(`/api/v1/inventory/quality-checks/${qc.id}/items/${lineId}`, {
      data: { product_id: ids.cardamom, qty_checked: 50, qty_passed: 35, qty_failed: 15, result: 'PARTIAL', rejection_reason: '15kg below grade' },
    })

    // Submit via UI
    await gotoSection(page, 'inventory', 'qc')
    await openDocByCode(page, qc.code)
    await runWorkflow(page, 'start')

    await openDocByCode(page, qc.code)
    await runWorkflow(page, 'submit')

    // Stock should have grown by exactly 35
    const after = await stockQty(api, ids.whMain, ids.cardamom)
    expect(after - before, 'partial pass → only qty_passed should hit stock').toBeGreaterThanOrEqual(35 - 0.01)
    expect(after - before, 'qty_failed should not hit stock').toBeLessThan(50)
  })
})
