// PO + auto-PINV — creating a PO should immediately spawn a draft Purchase
// Invoice linked by po_id. We verify this by listing invoices via API after the
// UI-driven PO creation.
import { test, expect } from '../fixtures/auth'
import { today } from '../fixtures/test-data'
import { getData } from '../fixtures/api'
import { gotoSection, clickNewRecord, selectField, fillField, saveDoc, expectRowStatus } from '../fixtures/selectors'

test.describe('Procurement — PO auto-creates draft Purchase Invoice', () => {
  test('Create PO via UI → PINV appears with matching po_id', async ({ loggedInPage: page, api, ids }) => {
    await gotoSection(page, 'procurement', 'po')
    await clickNewRecord(page)

    // Fill PO header
    await selectField(page, 'supplier_id',     ids.ceylonSpiceSupp)
    await fillField  (page, 'order_date',      today())
    await selectField(page, 'currency_id',     ids.currLkr)
    await selectField(page, 'payment_term_id', ids.termNet30)
    await selectField(page, 'warehouse_id',    ids.whMain)
    await fillField  (page, 'notes',           'E2E PO with auto-invoice')

    await saveDoc(page)

    // Find the newest PO via API (since codes are auto-generated)
    const pos = await getData<Array<{ id: number; code: string; supplier_id: number }>>(api, '/api/v1/procurement/purchase-orders')
    const newest = pos
      .filter(p => p.supplier_id === ids.ceylonSpiceSupp)
      .sort((a, b) => b.id - a.id)[0]
    expect(newest, 'no PO returned from list').toBeTruthy()

    // It should be DRAFT in the UI
    await expectRowStatus(page, newest.code, 'DRAFT')

    // And there should be a draft PINV linked to it
    const invs = await getData<Array<{ id: number; code: string; po_id: number; status: string }>>(api, '/api/v1/procurement/purchase-invoices')
    const linked = invs.find(i => i.po_id === newest.id && i.status === 'DRAFT')
    expect(linked, `no draft PINV linked to PO ${newest.code}`).toBeTruthy()
  })
})
