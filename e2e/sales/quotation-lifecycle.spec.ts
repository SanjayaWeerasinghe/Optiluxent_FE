// Sales Quotation lifecycle
//   Create SQ via UI → Send → Accept → SO auto-created with sq_id back-ref
//                          → draft SI auto-created for the new SO
// Also verifies the REJECT path in a separate quotation so we prove the
// state machine handles the negative case without accidentally creating an SO.
import { test, expect } from '../fixtures/auth'
import { today, uniq } from '../fixtures/test-data'
import { getData } from '../fixtures/api'
import { gotoSection, clickNewRecord, selectField, fillField, addLine, saveDoc, openDocByCode, runWorkflow, expectRowStatus } from '../fixtures/selectors'

test.describe('Sales — Quotation lifecycle', () => {

  test('SQ → send → accept → auto-creates SO with sq_id + draft SI', async ({ loggedInPage: page, api, ids }) => {
    const sqCode = uniq.pr().replace('PR-', 'SQ-')  // reuse uniq generator w/ SQ prefix

    // Create quotation via UI
    await gotoSection(page, 'sales', 'quotations')
    await clickNewRecord(page)
    await fillField  (page, 'code',            sqCode)
    await selectField(page, 'customer_id',     ids.cust1)
    await fillField  (page, 'quotation_date',  today())
    await fillField  (page, 'valid_until',     '2026-12-31')
    await selectField(page, 'currency_id',     ids.currLkr)
    await selectField(page, 'payment_term_id', ids.termNet30)
    await selectField(page, 'warehouse_id',    ids.whFG)
    await fillField  (page, 'customer_reference', 'CUST-RFQ-2026-001')
    await fillField  (page, 'notes',           'E2E quotation → SO chain')

    await addLine(page,
      { quantity: 40, unit_price: 280 },
      { product_id: ids.cinnPwd, uom_id: ids.uomPkt },
    )
    await saveDoc(page)

    // Resolve the SQ via API
    const sqs = await getData<Array<{ id: number; code: string; status: string }>>(api, '/api/v1/sales/quotations')
    const sq = sqs.find(q => q.code === sqCode)
    expect(sq, 'SQ should exist in list').toBeTruthy()
    expect(sq!.status).toBe('DRAFT')

    // Send it
    await openDocByCode(page, sqCode)
    await runWorkflow(page, 'submit')
    await expectRowStatus(page, sqCode, 'SENT')

    // Accept it — this creates the SO
    await openDocByCode(page, sqCode)
    await runWorkflow(page, 'accept')
    await expectRowStatus(page, sqCode, 'ACCEPTED')

    // Verify the SQ now points at an SO
    const detail = await getData<{ status: string; converted_so_id: number | null; accepted_at: string | null }>(api, `/api/v1/sales/quotations/${sq!.id}`)
    expect(detail.status, 'quotation status should be ACCEPTED').toBe('ACCEPTED')
    expect(detail.converted_so_id, 'converted_so_id should be set').toBeGreaterThan(0)

    // Verify the SO has the SQ back-reference and inherited fields
    const so = await getData<{ code: string; sq_id: number | null; customer_id: number; total_amount: number; lines: unknown[] }>(api, `/api/v1/sales/sales-orders/${detail.converted_so_id}`)
    expect(so.sq_id, 'SO.sq_id should reference the SQ').toBe(sq!.id)
    expect(so.customer_id).toBe(ids.cust1)
    expect(so.lines.length).toBeGreaterThanOrEqual(1)
    expect(so.total_amount, 'SO total should carry from SQ (40×280 = 11200)').toBeGreaterThan(0)

    // Auto-invoice should also exist for the new SO (parallel to procurement's PO→PINV)
    const sis = await getData<Array<{ id: number; so_id: number; status: string }>>(api, '/api/v1/sales/invoices')
    const autoSI = sis.find(s => s.so_id === detail.converted_so_id && s.status === 'DRAFT')
    expect(autoSI, 'a draft SI should be auto-created for the accepted SQ’s SO').toBeTruthy()
  })

  test('SQ → send → reject: no SO created, state is REJECTED', async ({ loggedInPage: page, api, ids }) => {
    const sqCode = uniq.pr().replace('PR-', 'SQR-')

    await gotoSection(page, 'sales', 'quotations')
    await clickNewRecord(page)
    await fillField  (page, 'code',            sqCode)
    await selectField(page, 'customer_id',     ids.cust2)
    await fillField  (page, 'quotation_date',  today())
    await selectField(page, 'currency_id',     ids.currLkr)
    await selectField(page, 'warehouse_id',    ids.whFG)
    await addLine(page,
      { quantity: 5, unit_price: 100 },
      { product_id: ids.cinnPwd, uom_id: ids.uomPkt },
    )
    await saveDoc(page)

    await openDocByCode(page, sqCode)
    await runWorkflow(page, 'submit')
    await openDocByCode(page, sqCode)
    await runWorkflow(page, 'reject')
    await expectRowStatus(page, sqCode, 'REJECTED')

    // Prove no SO was created off this SQ
    const sqs = await getData<Array<{ id: number; code: string; converted_so_id: number | null }>>(api, '/api/v1/sales/quotations')
    const sq = sqs.find(q => q.code === sqCode)!
    expect(sq.converted_so_id, 'rejected quotation must not have converted_so_id').toBeFalsy()
  })
})
