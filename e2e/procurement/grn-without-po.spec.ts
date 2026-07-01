// GRN WITHOUT_PO — ad-hoc receipt with no PO. Same QC gating as WITH_PO.
import { test, expect } from '../fixtures/auth'
import { today } from '../fixtures/test-data'
import { getData, stockQty } from '../fixtures/api'
import { gotoSection, clickNewRecord, selectField, fillField, addLine, saveDoc, openDocByCode, runWorkflow } from '../fixtures/selectors'

test.describe('Procurement — GRN WITHOUT_PO triggers Material QC', () => {
  test('Create GRN WITHOUT_PO via UI → Material QC auto-created', async ({ loggedInPage: page, api, ids }) => {
    const stockBefore = await stockQty(api, ids.whMain, ids.cardamom)

    await gotoSection(page, 'procurement', 'grn')
    await clickNewRecord(page)
    await selectField(page, 'grn_type',     'WITHOUT_PO')
    await selectField(page, 'supplier_id',  ids.indianSpiceSupp)
    await fillField  (page, 'receipt_date', today())
    await selectField(page, 'warehouse_id', ids.whMain)
    await fillField  (page, 'notes',        'E2E ad-hoc cardamom sample')

    await addLine(page,
      { quantity: 12, unit_cost: 4350 },
      { product_id: ids.cardamom, uom_id: ids.uomKg },
    )
    await saveDoc(page)

    const grns = await getData<Array<{ id: number; code: string; po_id?: number; supplier_id: number; grn_type: string }>>(api, '/api/v1/procurement/goods-receipts')
    const grn = grns
      .filter(g => !g.po_id && g.supplier_id === ids.indianSpiceSupp && g.grn_type === 'WITHOUT_PO')
      .sort((a, b) => b.id - a.id)[0]
    expect(grn, 'GRN WITHOUT_PO was not created').toBeTruthy()

    await openDocByCode(page, grn.code)
    await runWorkflow(page, 'confirm')

    // Stock gated
    expect(await stockQty(api, ids.whMain, ids.cardamom)).toBe(stockBefore)

    // QC auto-created
    const qcs = await getData<Array<{ qc_type: string; reference_type: string; reference_id: number; status: string }>>(api, '/api/v1/inventory/quality-checks')
    const qc = qcs.find(q => q.reference_type === 'GRN' && q.reference_id === grn.id)
    expect(qc, 'Material QC missing for WITHOUT_PO GRN').toBeTruthy()
    expect(qc!.qc_type).toBe('MATERIAL_QC')
  })
})
