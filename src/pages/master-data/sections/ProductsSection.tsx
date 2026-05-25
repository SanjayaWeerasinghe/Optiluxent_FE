import { useState } from 'react'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { Badge } from '../../../components/ui'
import { CrudSection, ActiveBadge, type FieldDef } from '../CrudSection'
import { type Column } from '../../../components/ui/Table'
import { uomOptions, categoryOptions, taxCodeOptions } from '../useOptions'

const ENTITY_TABS: TabItem[] = [
  { id: 'categories', label: 'Categories',     icon: 'category' },
  { id: 'uoms',       label: 'Units of Measure', icon: 'straighten' },
  { id: 'products',   label: 'Products',        icon: 'inventory' },
]

const BASE = '/api/v1/masterdata/products'

// ── Product Categories ────────────────────────────────────────────────────────
const CAT_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code', key: 'code', width: '100px' },
  { header: 'Name', key: 'name' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const CAT_FIELDS: FieldDef[] = [
  { key: 'code',      label: 'Code',   type: 'text', required: true, placeholder: 'RAW-MTL' },
  { key: 'name',      label: 'Name',   type: 'text', required: true, placeholder: 'Raw Materials' },
  { key: 'is_active', label: 'Active', type: 'toggle', editOnly: true },
]

// ── Units of Measure ──────────────────────────────────────────────────────────
const UOM_TYPES = [
  { value: 'UNIT',   label: 'Unit' },
  { value: 'WEIGHT', label: 'Weight' },
  { value: 'VOLUME', label: 'Volume' },
  { value: 'LENGTH', label: 'Length' },
  { value: 'TIME',   label: 'Time' },
  { value: 'AREA',   label: 'Area' },
]

const UOM_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code', key: 'code', width: '100px' },
  { header: 'Name', key: 'name' },
  { header: 'Type', key: 'uom_type', width: '90px' },
  { header: 'Conv. Factor', key: 'conversion_factor', width: '110px', align: 'right' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const UOM_FIELDS: FieldDef[] = [
  { key: 'code',              label: 'Code',              type: 'text',   required: true, placeholder: 'KG' },
  { key: 'name',              label: 'Name',              type: 'text',   required: true, placeholder: 'Kilogram' },
  { key: 'uom_type',          label: 'Type',              type: 'select', options: UOM_TYPES },
  { key: 'conversion_factor', label: 'Conversion Factor', type: 'number', min: 0, step: 0.0001 },
  { key: 'is_active',         label: 'Active',            type: 'toggle', editOnly: true },
]

// ── Products ──────────────────────────────────────────────────────────────────
const PRODUCT_TYPES = [
  { value: 'FINISHED',      label: 'Finished Good' },
  { value: 'RAW_MATERIAL',  label: 'Raw Material' },
  { value: 'SEMI_FINISHED', label: 'Semi-Finished' },
  { value: 'SERVICE',       label: 'Service' },
  { value: 'CONSUMABLE',    label: 'Consumable' },
]

const PROD_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',  key: 'code',  width: '120px' },
  { header: 'Name',  key: 'name' },
  {
    header: 'Type', key: 'product_type', width: '130px',
    render: r => <Badge variant="secondary">{String(r.product_type ?? '').replace('_', ' ')}</Badge>,
  },
  { header: 'Cost',  key: 'cost_price',     width: '100px', align: 'right',
    render: r => Number(r.cost_price ?? 0).toFixed(2) },
  { header: 'Price', key: 'standard_price', width: '100px', align: 'right',
    render: r => Number(r.standard_price ?? 0).toFixed(2) },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const PROD_FIELDS: FieldDef[] = [
  { key: 'code',           label: 'Code',              type: 'text',   required: true, placeholder: 'PRD-001' },
  { key: 'name',           label: 'Name',              type: 'text',   required: true, placeholder: 'Product name' },
  { key: 'product_type',   label: 'Product Type',      type: 'select', options: PRODUCT_TYPES },
  { key: 'category_id',    label: 'Category',          type: 'select', loadOptions: categoryOptions() },
  { key: 'base_uom_id',    label: 'Base UOM',          type: 'select', required: true, loadOptions: uomOptions() },
  { key: 'purchase_uom_id',label: 'Purchase UOM',      type: 'select', loadOptions: uomOptions() },
  { key: 'sales_uom_id',   label: 'Sales UOM',         type: 'select', loadOptions: uomOptions() },
  { key: 'tax_code_id',    label: 'Tax Code',          type: 'select', loadOptions: taxCodeOptions() },
  { key: 'cost_price',     label: 'Cost Price',        type: 'number', min: 0, step: 0.01 },
  { key: 'standard_price', label: 'Standard Price',    type: 'number', min: 0, step: 0.01 },
  { key: 'min_stock_qty',  label: 'Min Stock Qty',     type: 'number', min: 0, step: 0.001 },
  { key: 'reorder_qty',    label: 'Reorder Qty',       type: 'number', min: 0, step: 0.001 },
  { key: 'lead_time_days', label: 'Lead Time (days)',  type: 'number', min: 0, step: 1 },
  { key: 'description',    label: 'Description',       type: 'textarea', rows: 2 },
  { key: 'is_active',      label: 'Active',            type: 'toggle', editOnly: true },
]

export function ProductsSection() {
  const [tab, setTab] = useState('categories')

  return (
    <div className="space-y-4">
      <Tabs tabs={ENTITY_TABS} active={tab} onChange={setTab} size="sm" />
      <div className="pt-2">
        {tab === 'categories' && (
          <CrudSection
            endpoint={`${BASE}/categories`}
            columns={CAT_COLS}
            fields={CAT_FIELDS}
            searchFields={['code', 'name']}
            entityLabel="Category"
          />
        )}
        {tab === 'uoms' && (
          <CrudSection
            endpoint={`${BASE}/uoms`}
            columns={UOM_COLS}
            fields={UOM_FIELDS}
            searchFields={['code', 'name']}
            entityLabel="Unit of Measure"
          />
        )}
        {tab === 'products' && (
          <CrudSection
            endpoint={`${BASE}/`}
            columns={PROD_COLS}
            fields={PROD_FIELDS}
            searchFields={['code', 'name']}
            entityLabel="Product"
          />
        )}
      </div>
    </div>
  )
}
