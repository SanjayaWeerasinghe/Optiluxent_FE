// GRN CUSTOMER_RETURN — bypasses QC entirely and posts to stock immediately.
import { test, expect } from '../fixtures/auth'
import { today } from '../fixtures/test-data'
import { getData, stockQty } from '../fixtures/api'
import { gotoSection, clickNewRecord, selectField, fillField, addLine, saveDoc, openDocByCode, runWorkflow } from '../fixtures/selectors'

test.describe('Procurement — GRN CUSTOMER_RETURN posts to stock without QC', () => {
  test('Customer return → stock increases immediately, no QC', async ({ loggedInPage: page, api, ids }) => {
    const stockBefore = await stockQty(api, ids.whMain, ids.cloves)

    await gotoSection(page, 'procurement', 'grn')
    await clickNewRecord(page)
    await selectField(page, 'grn_type',     'CUSTOMER_RETURN')
    // The supplier_id dropdown only shows parties with party_type=SUPPLIER, so
    // even for a customer return we point at a supplier party — the schema
    // doesn't have a customer_id column on GRN, only supplier_id.
    await selectField(page, 'supplier_id',  ids.ceylonSpiceSupp)
    await fillField  (page, 'receipt_date', today())
    await selectField(page, 'warehouse_id', ids.whMain)
    await fillField  (page, 'notes',        'E2E customer return')

    await addLine(page,
      { quantity: 6, unit_cost: 3100 },
      { product_id: ids.cloves, uom_id: ids.uomKg },
    )
    await saveDoc(page)

    const grns = await getData<Array<{ id: number; code: string; grn_type: string }>>(api, '/api/v1/procurement/goods-receipts')
    const grn = grns.filter(g => g.grn_type === 'CUSTOMER_RETURN').sort((a, b) => b.id - a.id)[0]
    expect(grn, 'CUSTOMER_RETURN GRN not created').toBeTruthy()

    await openDocByCode(page, grn.code)
    await runWorkflow(page, 'confirm')

    // No QC should exist for this GRN
    const qcs = await getData<Array<{ reference_type: string; reference_id: number }>>(api, '/api/v1/inventory/quality-checks')
    const auto = qcs.find(q => q.reference_type === 'GRN' && q.reference_id === grn.id)
    expect(auto, `CUSTOMER_RETURN should not create a QC but found ${JSON.stringify(auto)}`).toBeFalsy()

    // Stock should have moved
    const after = await stockQty(api, ids.whMain, ids.cloves)
    expect(after - stockBefore, 'stock should have grown by the returned qty').toBeGreaterThanOrEqual(6 - 0.01)
  })
})
