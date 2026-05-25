import { useState } from 'react'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { CrudSection, ActiveBadge, type FieldDef } from '../CrudSection'
import { type Column } from '../../../components/ui/Table'
import { warehouseOptions } from '../useOptions'

const ENTITY_TABS: TabItem[] = [
  { id: 'warehouses', label: 'Warehouses',        icon: 'warehouse' },
  { id: 'locations',  label: 'Storage Locations', icon: 'shelves' },
]

const BASE = '/api/v1/masterdata/inventory'

// ── Warehouses ────────────────────────────────────────────────────────────────
const WH_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',    key: 'code',    width: '100px' },
  { header: 'Name',    key: 'name' },
  { header: 'Address', key: 'address' },
  { header: 'Status',  key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const WH_FIELDS: FieldDef[] = [
  { key: 'code',      label: 'Code',    type: 'text', required: true, placeholder: 'WH-MAIN' },
  { key: 'name',      label: 'Name',    type: 'text', required: true, placeholder: 'Main Warehouse' },
  { key: 'address',   label: 'Address', type: 'textarea', rows: 2 },
  { key: 'is_active', label: 'Active',  type: 'toggle', editOnly: true },
]

// ── Storage Locations ─────────────────────────────────────────────────────────
const LOC_TYPES = [
  { value: 'STORAGE',  label: 'Storage' },
  { value: 'RECEIVING', label: 'Receiving' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'QC',       label: 'Quality Control' },
  { value: 'SCRAP',    label: 'Scrap' },
]

const LOC_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',      key: 'code',          width: '100px' },
  { header: 'Name',      key: 'name' },
  { header: 'Type',      key: 'location_type', width: '110px' },
  { header: 'Status',    key: 'is_active',     width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

// Note: locations are created under a warehouse. We list all via a flat endpoint
// and the warehouse is a required field on create.
const LOC_FIELDS: FieldDef[] = [
  { key: 'warehouse_id',  label: 'Warehouse',     type: 'select', required: true, loadOptions: warehouseOptions() },
  { key: 'code',          label: 'Code',          type: 'text',   required: true, placeholder: 'LOC-A1' },
  { key: 'name',          label: 'Name',          type: 'text',   required: true, placeholder: 'Aisle A, Shelf 1' },
  { key: 'location_type', label: 'Location Type', type: 'select', options: LOC_TYPES },
  { key: 'is_active',     label: 'Active',        type: 'toggle', editOnly: true },
]

export function InventorySection() {
  const [tab,              setTab]              = useState('warehouses')
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      <Tabs tabs={ENTITY_TABS} active={tab} onChange={setTab} size="sm" />
      <div className="pt-2">
        {tab === 'warehouses' && (
          <CrudSection
            endpoint={`${BASE}/warehouses`}
            columns={WH_COLS}
            fields={WH_FIELDS}
            searchFields={['code', 'name']}
            entityLabel="Warehouse"
          />
        )}
        {tab === 'locations' && (
          <CrudSection
            endpoint={`${BASE}/warehouses/${selectedWarehouse ?? 0}/locations`}
            columns={LOC_COLS}
            fields={LOC_FIELDS}
            searchFields={['code', 'name']}
            entityLabel="Location"
          />
        )}
      </div>
    </div>
  )
}
