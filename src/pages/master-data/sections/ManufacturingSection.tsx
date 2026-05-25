import { useState } from 'react'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { Badge } from '../../../components/ui'
import { CrudSection, ActiveBadge, type FieldDef } from '../CrudSection'
import { type Column } from '../../../components/ui/Table'
import { currencyOptions, uomOptions, productOptions } from '../useOptions'

const ENTITY_TABS: TabItem[] = [
  { id: 'work-centers', label: 'Work Centers',     icon: 'precision_manufacturing' },
  { id: 'boms',         label: 'Bills of Materials', icon: 'format_list_bulleted' },
  { id: 'routings',     label: 'Routings',          icon: 'route' },
]

const BASE = '/api/v1/masterdata/manufacturing'

// ── Work Centers ──────────────────────────────────────────────────────────────
const WC_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',     key: 'code',          width: '100px' },
  { header: 'Name',     key: 'name' },
  { header: 'Capacity', key: 'capacity',      width: '90px', align: 'right' },
  { header: 'Cost/hr',  key: 'cost_per_hour', width: '90px', align: 'right',
    render: r => Number(r.cost_per_hour ?? 0).toFixed(2) },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const WC_FIELDS: FieldDef[] = [
  { key: 'code',          label: 'Code',          type: 'text',   required: true, placeholder: 'WC-CNC-01' },
  { key: 'name',          label: 'Name',          type: 'text',   required: true, placeholder: 'CNC Machine 1' },
  { key: 'capacity',      label: 'Capacity',      type: 'number', min: 0, step: 0.01 },
  { key: 'cost_per_hour', label: 'Cost per Hour', type: 'number', min: 0, step: 0.01 },
  { key: 'currency_id',   label: 'Currency',      type: 'select', required: true, loadOptions: currencyOptions() },
  { key: 'notes',         label: 'Notes',         type: 'textarea', rows: 2 },
  { key: 'is_active',     label: 'Active',        type: 'toggle', editOnly: true },
]

// ── Bills of Materials ────────────────────────────────────────────────────────
const BOM_TYPES = [
  { value: 'MANUFACTURE', label: 'Manufacture' },
  { value: 'KIT',         label: 'Kit' },
  { value: 'PHANTOM',     label: 'Phantom' },
]

const BOM_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',    key: 'code',     width: '120px' },
  { header: 'Product', key: 'product_id', width: '100px' },
  {
    header: 'Type', key: 'bom_type', width: '110px',
    render: r => <Badge variant="info">{String(r.bom_type ?? '')}</Badge>,
  },
  { header: 'Qty', key: 'quantity', width: '80px', align: 'right' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const BOM_FIELDS: FieldDef[] = [
  { key: 'code',       label: 'Code',      type: 'text',   required: true, placeholder: 'BOM-001' },
  { key: 'product_id', label: 'Product',   type: 'select', required: true, loadOptions: productOptions() },
  { key: 'uom_id',     label: 'UOM',       type: 'select', required: true, loadOptions: uomOptions() },
  { key: 'quantity',   label: 'Quantity',  type: 'number', min: 0, step: 0.001 },
  { key: 'bom_type',   label: 'BOM Type',  type: 'select', options: BOM_TYPES },
  { key: 'notes',      label: 'Notes',     type: 'textarea', rows: 2 },
]

// ── Routings ──────────────────────────────────────────────────────────────────
const RT_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',    key: 'code',       width: '120px' },
  { header: 'Product', key: 'product_id', width: '100px' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const RT_FIELDS: FieldDef[] = [
  { key: 'code',       label: 'Code',    type: 'text',   required: true, placeholder: 'RT-001' },
  { key: 'product_id', label: 'Product', type: 'select', required: true, loadOptions: productOptions() },
  { key: 'notes',      label: 'Notes',   type: 'textarea', rows: 2 },
]

export function ManufacturingSection() {
  const [tab, setTab] = useState('work-centers')

  return (
    <div className="space-y-4">
      <Tabs tabs={ENTITY_TABS} active={tab} onChange={setTab} size="sm" />
      <div className="pt-2">
        {tab === 'work-centers' && (
          <CrudSection
            endpoint={`${BASE}/work-centers`}
            columns={WC_COLS}
            fields={WC_FIELDS}
            searchFields={['code', 'name']}
            entityLabel="Work Center"
          />
        )}
        {tab === 'boms' && (
          <CrudSection
            endpoint={`${BASE}/boms`}
            columns={BOM_COLS}
            fields={BOM_FIELDS}
            searchFields={['code']}
            entityLabel="BOM"
          />
        )}
        {tab === 'routings' && (
          <CrudSection
            endpoint={`${BASE}/routings`}
            columns={RT_COLS}
            fields={RT_FIELDS}
            searchFields={['code']}
            entityLabel="Routing"
          />
        )}
      </div>
    </div>
  )
}
