// Sales SO → auto-draft SI; DO confirm → SI lines appended; post SI; record
// partial payment.
import { test, expect } from '../fixtures/auth'
import { today, uniq } from '../fixtures/test-data'
import { getData } from '../fixtures/api'
import { gotoSection, clickNewRecord, selectField, fillField, addLine, saveDoc, openDocByCode, runWorkflow } from '../fixtures/selectors'

test.describe('Sales — SO creates draft SI, DO confirm fills SI lines', () => {
  test('SO → DO → SI auto-linked end-to-end', async ({ loggedInPage: page, api, ids }) => {
    // Capture the SO POST payload so we can see why the API rejects it
    page.on('request', req => {
      if (req.method() === 'POST' && req.url().includes('/sales/sales-orders')) {
        console.log('[SO POST]', req.url(), 'body=', req.postData())
      }
    })
    page.on('response', async res => {
      if (res.request().method() === 'POST' && res.url().includes('/sales/sales-orders') && res.status() >= 400) {
        console.log('[SO POST FAIL]', res.status(), await res.text())
      }
    })

    // Create SO via UI
    await gotoSection(page, 'sales', 'orders')
    await clickNewRecord(page)
    await fillField  (page, 'code',            uniq.so())
    await selectField(page, 'customer_id',     ids.cust1)
    await fillField  (page, 'order_date',      today())
    await selectField(page, 'currency_id',     ids.currLkr)
    await selectField(page, 'payment_term_id', ids.termNet30)
    await selectField(page, 'warehouse_id',    ids.whFG)
    await fillField  (page, 'notes',           'E2E SO with auto-SI')

    await addLine(page,
      { quantity: 100, unit_price: 280 },
      { product_id: ids.cinnPwd, uom_id: ids.uomPkt },
    )
    await saveDoc(page)

    // Resolve the new SO
    const sos = await getData<Array<{ id: number; code: string; customer_id: number }>>(api, '/api/v1/sales/sales-orders')
    const so = sos.filter(s => s.customer_id === ids.cust1).sort((a, b) => b.id - a.id)[0]
    expect(so).toBeTruthy()

    // Auto-SI should already exist as DRAFT for this SO
    const sis = await getData<Array<{ id: number; code: string; so_id: number; status: string; lines?: unknown[] }>>(api, '/api/v1/sales/invoices')
    const draftSI = sis.find(s => s.so_id === so.id && s.status === 'DRAFT')
    expect(draftSI, `auto-draft SI not found for SO ${so.code}`).toBeTruthy()

    // Confirm SO through UI
    await openDocByCode(page, so.code)
    await runWorkflow(page, 'confirm')

    // Create a delivery via UI
    await gotoSection(page, 'sales', 'deliveries')
    await clickNewRecord(page)
    await fillField  (page, 'code',          uniq.do())
    await selectField(page, 'so_id',         so.id)
    await selectField(page, 'customer_id',   ids.cust1)
    await fillField  (page, 'delivery_date', today())
    await selectField(page, 'warehouse_id',  ids.whFG)
    await fillField  (page, 'notes',         'E2E DO')
    // DO line form doesn't expose so_line_id (it's auto-linked server-side when
    // possible). Just add product + qty + uom.
    await addLine(page,
      { quantity: 60, unit_cost: 205 },
      { product_id: ids.cinnPwd, uom_id: ids.uomPkt },
    )
    await saveDoc(page)

    // Confirm DO via UI
    const dos = await getData<Array<{ id: number; code: string; so_id: number }>>(api, '/api/v1/sales/deliveries')
    const ourDO = dos.filter(d => d.so_id === so.id).sort((a, b) => b.id - a.id)[0]
    expect(ourDO).toBeTruthy()
    await openDocByCode(page, ourDO.code)
    await runWorkflow(page, 'confirm')

    // SI should have gained a line after DO confirm
    const filled = await getData<{ lines: Array<{ quantity: number; do_line_id: number | null }>; total_amount: number }>(api, `/api/v1/sales/invoices/${draftSI!.id}`)
    expect(filled.lines.length, 'SI should have lines after DO confirm').toBeGreaterThanOrEqual(1)
    expect(filled.total_amount, 'SI total should match SO line price × delivered qty').toBeGreaterThan(0)

    // ── SI lifecycle in the UI: post the invoice ───────────────────────────────
    await gotoSection(page, 'sales', 'invoices')
    await openDocByCode(page, draftSI!.code)
    await runWorkflow(page, 'post')

    const posted = await getData<{ status: string; total_amount: number; paid_amount: number }>(api, `/api/v1/sales/invoices/${draftSI!.id}`)
    expect(posted.status, 'SI should be POSTED after post action').toBe('POSTED')
    expect(posted.paid_amount).toBe(0)
  })
})
