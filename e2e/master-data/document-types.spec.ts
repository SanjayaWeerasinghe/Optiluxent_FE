// Document Types end-to-end.
//
// 1. Create a GRN Type via API with two picker fields (Original PO + Supplier)
// 2. Create a GRN with that Type via API and post two field values
// 3. Fetch back through /documents/GRN/:id/fields — values should round-trip
// 4. Open the GRN in the FE, verify the picker slots render
import { test, expect } from '../fixtures/auth'
import { getData, postData } from '../fixtures/api'
import { today, uniq } from '../fixtures/test-data'

test.describe('Master Data — Document Types', () => {
  test('create a GRN Type + fields, use it on a GRN, values round-trip', async ({ loggedInPage: page, api, ids }) => {
    // 1. Create the Type
    const type = await postData<{ id: number; code: string }>(api, '/api/v1/masterdata/document-types', {
      model: 'GRN',
      code:  `IMPORT_${Date.now()}`,
      name:  'Import Return',
      is_active: true,
    })
    expect(type.id).toBeGreaterThan(0)

    // Add two fields
    const fieldPO = await postData<{ id: number }>(api, `/api/v1/masterdata/document-types/${type.id}/fields`, {
      code: 'original_po', label: 'Original PO', kind: 'PO', is_required: false, display_order: 1,
    })
    const fieldSup = await postData<{ id: number }>(api, `/api/v1/masterdata/document-types/${type.id}/fields`, {
      code: 'origin_supplier', label: 'Origin Supplier', kind: 'Supplier', is_required: false, display_order: 2,
    })

    // 2. Create a GRN with this Type
    const grn = await postData<{ id: number; code: string }>(api, '/api/v1/procurement/goods-receipts', {
      document_type_id: type.id,
      supplier_id: 1,
      receipt_date: today(),
      warehouse_id: ids.whMain,
      notes: 'E2E document-type test',
    })
    expect(grn.id).toBeGreaterThan(0)

    // Post field values
    await postData(api, `/api/v1/documents/GRN/${grn.id}/fields`, {
      values: [
        { field_id: fieldPO.id,  ref_id: 1 }, // any existing PO
        { field_id: fieldSup.id, ref_id: 1 }, // any existing supplier
      ],
    })

    // 3. Round-trip the values
    const values = await getData<Array<{ field_id: number; ref_id: number | null; kind: string }>>(
      api, `/api/v1/documents/GRN/${grn.id}/fields?type_id=${type.id}`
    )
    expect(values).toHaveLength(2)
    const byField = Object.fromEntries(values.map(v => [v.field_id, v.ref_id]))
    expect(byField[fieldPO.id]).toBe(1)
    expect(byField[fieldSup.id]).toBe(1)

    // 4. Open the GRN in the UI, confirm the picker slots show up.
    // Wait for the whole modal + header GET + fields fetch to settle by
    // asserting the Type combobox surfaces the new Type's label first — this
    // proves the header form finished loading, so the fields fetch has also
    // kicked off. Then check for the field labels.
    await page.goto('/procurement?section=grn')
    await page.getByRole('cell', { name: grn.code, exact: true }).click()

    // The Type combobox should carry a label containing our new Type's code.
    const typeCombo = page.getByLabel('GRN Type', { exact: false }).or(page.getByLabel('Type', { exact: false })).first()
    await expect(typeCombo).toContainText(type.code, { timeout: 20_000 })

    await expect(page.getByText('Original PO')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Origin Supplier')).toBeVisible()
  })
})
