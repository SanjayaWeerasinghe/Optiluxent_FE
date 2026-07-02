import { apiGet } from '../../lib/api'
import { type SelectOption } from './CrudSection'

// Loaders for common foreign-key dropdowns
// Each returns a thunk so it can be passed to FieldDef.loadOptions

export function currencyOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/financial/currencies')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}

export function departmentOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/organization/departments')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}

export function uomOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/products/uoms')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}

export function categoryOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/products/categories')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}

export function warehouseOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/inventory/warehouses')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}

export function coaOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/financial/chart-of-accounts')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}

export function bankOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; name: string; branch_name: string }[]>('/api/v1/masterdata/financial/banks')
      .then(rows => rows.map(r => ({ value: r.id, label: r.branch_name ? `${r.name} (${r.branch_name})` : r.name })))
      .catch(() => [])
}

export function fiscalYearOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; name: string }[]>('/api/v1/masterdata/organization/fiscal-years')
      .then(rows => rows.map(r => ({ value: r.id, label: r.name })))
      .catch(() => [])
}

export function paymentTermOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/financial/payment-terms')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}

export function taxCodeOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/financial/tax-codes')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}

export function productOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/products/')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}

export function jobPositionOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/hr/job-positions')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}

export function supplierOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string; party_type: string }[]>('/api/v1/masterdata/contacts/parties')
      .then(rows =>
        rows
          .filter(r => r.party_type === 'SUPPLIER' || r.party_type === 'BOTH')
          .map(r => ({ value: r.id, label: `${r.code} – ${r.name}` }))
      )
      .catch(() => [])
}

export function purchaseOrderOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string }[]>('/api/v1/procurement/purchase-orders')
      .then(rows => rows.map(r => ({ value: r.id, label: r.code })))
      .catch(() => [])
}

export function customerOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string; party_type: string }[]>('/api/v1/masterdata/contacts/parties')
      .then(rows =>
        rows
          .filter(r => r.party_type === 'CUSTOMER' || r.party_type === 'BOTH')
          .map(r => ({ value: r.id, label: `${r.code} – ${r.name}` }))
      )
      .catch(() => [])
}

export function salesOrderOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string }[]>('/api/v1/sales/sales-orders')
      .then(rows => rows.map(r => ({ value: r.id, label: r.code })))
      .catch(() => [])
}

export function bomOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string }[]>('/api/v1/masterdata/manufacturing/boms')
      .then(rows => rows.map(r => ({ value: r.id, label: r.code })))
      .catch(() => [])
}

export function routingOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string }[]>('/api/v1/masterdata/manufacturing/routings')
      .then(rows => rows.map(r => ({ value: r.id, label: r.code })))
      .catch(() => [])
}

export function workCenterOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/manufacturing/work-centers')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}

export function costEstimateOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string }[]>('/api/v1/manufacturing/pre-costs')
      .then(rows => rows.map(r => ({ value: r.id, label: r.code })))
      .catch(() => [])
}

export function productionPlanOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string }[]>('/api/v1/manufacturing/plans')
      .then(rows => rows.map(r => ({ value: r.id, label: r.code })))
      .catch(() => [])
}

export function productionOrderOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string }[]>('/api/v1/manufacturing/orders')
      .then(rows => rows.map(r => ({ value: r.id, label: r.code })))
      .catch(() => [])
}

export function materialCategoryOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<{ id: number; code: string; name: string }[]>('/api/v1/masterdata/material-categories')
      .then(rows => rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` })))
      .catch(() => [])
}
