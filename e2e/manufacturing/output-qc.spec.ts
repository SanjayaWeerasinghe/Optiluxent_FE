// Manufacturing — AddOutput triggers Product QC. Grading FAILED leaves stock
// unchanged.
import { test, expect } from '../fixtures/auth'
import { postData, getData, stockQty } from '../fixtures/api'

test.describe('Manufacturing — Production Output triggers Product QC', () => {
  test('Output → PRODUCT_QC PENDING → grade FAILED → stock unchanged', async ({ api, ids }) => {
    const stockBefore = await stockQty(api, ids.whFG, ids.cinnPwd)

    const order = await postData<{ id: number; code: string }>(api, '/api/v1/manufacturing/orders', {
      product_id: ids.cinnPwd, uom_id: ids.uomPkt, planned_qty: 80, warehouse_id: ids.whFG,
      notes: 'E2E manufacturing output → product QC',
    })
    const out = await postData<{ id: number }>(api, `/api/v1/manufacturing/orders/${order.id}/outputs`, {
      product_id: ids.cinnPwd, uom_id: ids.uomPkt, quantity: 80, unit_cost: 205,
      warehouse_id: ids.whFG, location_id: ids.locFG, notes: 'E2E output batch',
    })

    // Product QC should be auto-created
    const qcs = await getData<Array<{ id: number; qc_type: string; reference_type: string; reference_id: number; status: string }>>(api, '/api/v1/inventory/quality-checks')
    const qc = qcs.find(q => q.reference_type === 'PRODUCTION_OUTPUT' && q.reference_id === out.id)
    expect(qc, 'Product QC missing for production output').toBeTruthy()
    expect(qc!.qc_type).toBe('PRODUCT_QC')

    // Grade FAILED on the line
    const detail = await getData<{ lines: Array<{ id: number }> }>(api, `/api/v1/inventory/quality-checks/${qc!.id}`)
    const lineId = detail.lines[0].id
    await api.put(`/api/v1/inventory/quality-checks/${qc!.id}/items/${lineId}`, {
      data: { product_id: ids.cinnPwd, qty_checked: 80, qty_passed: 0, qty_failed: 80, result: 'FAILED', rejection_reason: 'E2E intentional fail' },
    })
    await api.post(`/api/v1/inventory/quality-checks/${qc!.id}/start`)
    await api.post(`/api/v1/inventory/quality-checks/${qc!.id}/submit`)

    // Stock should NOT have moved (failed batch)
    expect(await stockQty(api, ids.whFG, ids.cinnPwd)).toBe(stockBefore)
  })
})
