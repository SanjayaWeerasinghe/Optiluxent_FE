// GRN WITH_PO → auto Material QC, stock gated until QC PASSED.
// We seed PR/PO/lines via API to focus the UI on the GRN flow itself.
import { test, expect } from '../fixtures/auth'
import { today } from '../fixtures/test-data'
import { postData, getData, stockQty } from '../fixtures/api'
import { gotoSection, clickNewRecord, selectField, fillField, addLine, saveDoc, openDocByCode, runWorkflow } from '../fixtures/selectors'

test.describe('Procurement — GRN WITH_PO triggers Material QC and gates stock', () => {
  test('GRN WITH_PO confirm → QC PENDING, stock unchanged → grade PASSED → stock posts', async ({ loggedInPage: page, api, ids }) => {
    // Arrange: PO + line, leave it DRAFT (no need to confirm for GRN linkage)
    const po = await postData<{ id: number; code: string }>(api, '/api/v1/procurement/purchase-orders', {
      supplier_id: ids.galleClovesSupp,
      order_date: today(),
      currency_id: ids.currLkr,
      payment_term_id: ids.termNet30,
      warehouse_id: ids.whMain,
      notes: 'E2E PO for GRN WITH_PO test',
    })
    const poLine = await postData<{ id: number }>(api, `/api/v1/procurement/purchase-orders/${po.id}/items`, {
      product_id: ids.cloves, quantity: 30, uom_id: ids.uomKg, unit_price: 3100,
    })

    const stockBefore = await stockQty(api, ids.whMain, ids.cloves)

    // Act: create the GRN via UI
    await gotoSection(page, 'procurement', 'grn')
    await clickNewRecord(page)
    await selectField(page, 'grn_type',     'WITH_PO')
    await selectField(page, 'po_id',        po.id)
    await selectField(page, 'supplier_id',  ids.galleClovesSupp)
    await fillField  (page, 'receipt_date', today())
    await selectField(page, 'warehouse_id', ids.whMain)
    await fillField  (page, 'notes',        'E2E GRN WITH_PO')

    await addLine(page,
      { quantity: 30, unit_cost: 3100 },
      { product_id: ids.cloves, uom_id: ids.uomKg },
    )
    await saveDoc(page)

    // Grab the newest GRN linked to this PO
    const grns = await getData<Array<{ id: number; code: string; po_id?: number; grn_type: string; status: string }>>(api, '/api/v1/procurement/goods-receipts')
    const grn = grns.filter(g => g.po_id === po.id).sort((a, b) => b.id - a.id)[0]
    expect(grn).toBeTruthy()
    expect(grn.grn_type).toBe('WITH_PO')
    expect(grn.status).toBe('DRAFT')

    // Confirm the GRN through the UI
    await openDocByCode(page, grn.code)
    await runWorkflow(page, 'confirm')

    // Stock should NOT have moved yet
    const stockAfterConfirm = await stockQty(api, ids.whMain, ids.cloves)
    expect(stockAfterConfirm, 'stock should be gated until QC passes').toBe(stockBefore)

    // Auto-QC should exist with type MATERIAL_QC, status PENDING
    const qcs = await getData<Array<{ id: number; code: string; qc_type: string; reference_type: string; reference_id: number; status: string; lines?: Array<{ id: number }> }>>(api, '/api/v1/inventory/quality-checks')
    const qc = qcs.find(q => q.reference_type === 'GRN' && q.reference_id === grn.id)
    expect(qc, 'Material QC was not auto-created').toBeTruthy()
    expect(qc!.qc_type).toBe('MATERIAL_QC')
    expect(qc!.status).toBe('PENDING')

    // Grade the QC line via API (FE doesn't yet expose inline line edit) and submit through UI
    const qcDetail = await getData<{ lines: Array<{ id: number }> }>(api, `/api/v1/inventory/quality-checks/${qc!.id}`)
    const lineId = qcDetail.lines[0].id
    await api.put(`/api/v1/inventory/quality-checks/${qc!.id}/items/${lineId}`, {
      data: { product_id: ids.cloves, qty_checked: 30, qty_passed: 30, qty_failed: 0, result: 'PASSED' },
    })

    // Now submit through UI: navigate to QC section, open this QC, start then submit
    await gotoSection(page, 'inventory', 'qc')
    await openDocByCode(page, qc!.code)
    await runWorkflow(page, 'start')

    await openDocByCode(page, qc!.code)
    await runWorkflow(page, 'submit')

    // Stock should now have increased by 30
    const stockAfter = await stockQty(api, ids.whMain, ids.cloves)
    expect(stockAfter - stockBefore, 'stock should have gained the passed qty').toBeGreaterThanOrEqual(30 - 0.01)
  })
})
