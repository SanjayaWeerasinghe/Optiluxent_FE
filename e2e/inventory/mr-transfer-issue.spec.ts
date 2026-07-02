// Inventory ops — Material Request approve, Goods Transfer send/receive, Goods
// Issue confirm. All driven through the UI to confirm the section pages work.
import { test, expect } from '../fixtures/auth'
import { today, uniq } from '../fixtures/test-data'
import { postData, getData } from '../fixtures/api'
import { gotoSection, openDocByCode, runWorkflow, clickNewRecord, selectField, fillField, addLine, saveDoc, expectRowStatus } from '../fixtures/selectors'

test.describe('Inventory — MR / Transfer / Issue flows', () => {
  test('Material Request → approve via UI', async ({ loggedInPage: page, api, ids }) => {
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('/inventory/material-requests')) {
        console.log('[MR POST]', req.url())
      }
    })
    page.on('response', async res => {
      if (res.request().method() === 'POST' && res.url().includes('/inventory/material-requests') && res.status() >= 400) {
        console.log('[MR FAIL]', res.status(), await res.text())
      }
    })
    const mr = await postData<{ id: number; code: string }>(api, '/api/v1/inventory/material-requests', {
      requested_by: 1,
      warehouse_id: ids.whMain,
      needed_date: today(),
      notes: 'E2E MR approve',
    })
    console.log('[MR ARRANGED] id=', mr.id, 'code=', mr.code)
    await postData(api, `/api/v1/inventory/material-requests/${mr.id}/items`, {
      product_id: ids.cinnStick, uom_id: ids.uomKg, requested_qty: 5,
    })

    await gotoSection(page, 'inventory', 'mr')
    await openDocByCode(page, mr.code)
    await runWorkflow(page, 'approve')
    await expectRowStatus(page, mr.code, 'APPROVED')
  })

  test('Goods Transfer → send and receive via UI', async ({ loggedInPage: page, api, ids }) => {
    await gotoSection(page, 'inventory', 'transfers')
    await clickNewRecord(page)
    await fillField  (page, 'code',              uniq.gt())
    await selectField(page, 'from_warehouse_id', ids.whMain)
    await selectField(page, 'to_warehouse_id',   ids.whFG)
    await fillField  (page, 'transfer_date',     today())
    await fillField  (page, 'notes',             'E2E transfer')
    await addLine(page,
      { quantity: 1 },
      { product_id: ids.cinnStick, uom_id: ids.uomKg },
    )
    await saveDoc(page)

    const transfers = await getData<Array<{ id: number; code: string; from_warehouse_id: number; to_warehouse_id: number }>>(api, '/api/v1/inventory/transfers')
    const t = transfers.filter(x => x.from_warehouse_id === ids.whMain && x.to_warehouse_id === ids.whFG).sort((a, b) => b.id - a.id)[0]
    expect(t).toBeTruthy()

    await openDocByCode(page, t.code)
    await runWorkflow(page, 'send')

    await openDocByCode(page, t.code)
    await runWorkflow(page, 'receive')
    await expectRowStatus(page, t.code, 'RECEIVED')
  })

  test('Goods Issue → confirm via UI', async ({ loggedInPage: page, api, ids }) => {
    await gotoSection(page, 'inventory', 'issues')
    await clickNewRecord(page)
    await fillField  (page, 'code',          uniq.gi())
    await fillField  (page, 'issue_date',    today())
    await selectField(page, 'warehouse_id',  ids.whMain)
    await selectField(page, 'issue_reason',  'EXPENSE')
    await fillField  (page, 'notes',         'E2E issue')
    await addLine(page,
      { quantity: 1, unit_cost: 100 },
      { product_id: ids.cinnStick, uom_id: ids.uomKg },
    )
    await saveDoc(page)

    const issues = await getData<Array<{ id: number; code: string; issue_reason: string }>>(api, '/api/v1/inventory/issues')
    const i = issues.filter(x => x.issue_reason === 'EXPENSE').sort((a, b) => b.id - a.id)[0]
    expect(i).toBeTruthy()

    await openDocByCode(page, i.code)
    await runWorkflow(page, 'confirm')
    await expectRowStatus(page, i.code, 'CONFIRMED')
  })
})
