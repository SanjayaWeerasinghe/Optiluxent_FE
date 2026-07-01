// PR lifecycle — DRAFT → submit → approve, plus a separate reject and cancel
// flow. We arrange the PR via API to keep the spec focused on the state
// transitions through the UI.
import { test, expect } from '../fixtures/auth'
import { uniq, today } from '../fixtures/test-data'
import { postData } from '../fixtures/api'
import { gotoSection, openDocByCode, runWorkflow, expectRowStatus } from '../fixtures/selectors'

test.describe('Procurement — Purchase Request lifecycle', () => {
  test('DRAFT → submit → approve', async ({ loggedInPage: page, api, ids }) => {
    // Arrange: create PR + line via API
    const pr = await postData<{ id: number; code: string }>(api, '/api/v1/procurement/purchase-requests', {
      request_date: today(),
      notes: 'E2E lifecycle (approve path)',
    })
    await postData(api, `/api/v1/procurement/purchase-requests/${pr.id}/items`, {
      product_id: ids.cloves, quantity: 10, uom_id: ids.uomKg, estimated_price: 3100, currency_id: ids.currLkr,
    })

    // Act: open the PR via the UI, submit, approve
    await gotoSection(page, 'procurement', 'pr')
    await expectRowStatus(page, pr.code, 'DRAFT')
    await openDocByCode(page, pr.code)
    await runWorkflow(page, 'submit')

    await openDocByCode(page, pr.code)
    await runWorkflow(page, 'approve')

    // Assert: PR is APPROVED in the list
    await expectRowStatus(page, pr.code, 'APPROVED')
  })

  test('DRAFT → submit → reject', async ({ loggedInPage: page, api, ids }) => {
    const pr = await postData<{ id: number; code: string }>(api, '/api/v1/procurement/purchase-requests', {
      request_date: today(),
      notes: 'E2E lifecycle (reject path)',
    })
    await postData(api, `/api/v1/procurement/purchase-requests/${pr.id}/items`, {
      product_id: ids.ceylonTea, quantity: 5, uom_id: ids.uomKg, estimated_price: 1200, currency_id: ids.currLkr,
    })

    await gotoSection(page, 'procurement', 'pr')
    await openDocByCode(page, pr.code)
    await runWorkflow(page, 'submit')

    await openDocByCode(page, pr.code)
    await runWorkflow(page, 'reject')

    await expectRowStatus(page, pr.code, 'REJECTED')
  })

  test('DRAFT → cancel', async ({ loggedInPage: page, api }) => {
    const pr = await postData<{ id: number; code: string }>(api, '/api/v1/procurement/purchase-requests', {
      request_date: today(),
      notes: 'E2E lifecycle (cancel path)',
    })

    await gotoSection(page, 'procurement', 'pr')
    await openDocByCode(page, pr.code)
    await runWorkflow(page, 'cancel')

    await expectRowStatus(page, pr.code, 'CANCELLED')
  })
})
