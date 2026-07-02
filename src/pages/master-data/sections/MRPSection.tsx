import { useState } from 'react'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { CrudSection, ActiveBadge, type FieldDef } from '../CrudSection'
import { type Column } from '../../../components/ui/Table'
import { productOptions } from '../useOptions'

const BASE = '/api/v1/masterdata/mrp'

const MATERIAL_TABS: TabItem[] = [
  { id: 'RAW_MATERIAL',  label: 'Raw Materials',      icon: 'category' },
  { id: 'SEMI_FINISHED', label: 'Semi-Finished Goods', icon: 'precision_manufacturing' },
  { id: 'SERVICE',       label: 'Services',            icon: 'miscellaneous_services' },
]

const MRP_TYPE_OPTIONS = [
  { value: 'MRP',           label: 'MRP' },
  { value: 'REORDER_POINT', label: 'Reorder Point' },
  { value: 'MANUAL',        label: 'Manual' },
  { value: 'NO_PLANNING',   label: 'No Planning' },
]

const PROCUREMENT_OPTIONS = [
  { value: 'EXTERNAL', label: 'External' },
  { value: 'IN_HOUSE', label: 'In-House' },
  { value: 'BOTH',     label: 'Both' },
]

const LOT_SIZE_OPTIONS = [
  { value: 'LOT_FOR_LOT',    label: 'Lot for Lot' },
  { value: 'FIXED_LOT',      label: 'Fixed Lot' },
  { value: 'ECONOMIC_ORDER', label: 'Economic Order Qty' },
]

const ABC_CLASS_OPTIONS = [
  { value: 'A', label: 'A — High value' },
  { value: 'B', label: 'B — Medium value' },
  { value: 'C', label: 'C — Low value' },
]

const COLS: Column<Record<string, unknown>>[] = [
  { header: 'Product Code', key: 'product_code', width: '120px' },
  { header: 'Product Name', key: 'product_name' },
  { header: 'MRP Type',     key: 'mrp_type',         width: '130px' },
  { header: 'Procurement',  key: 'procurement_type', width: '110px' },
  { header: 'ABC',          key: 'abc_class',         width: '60px' },
  { header: 'Status',       key: 'is_active',         width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const FIELDS: FieldDef[] = [
  { key: 'product_id',           label: 'Product',                      type: 'select',   required: true, loadOptions: productOptions(), createOnly: true },
  { key: 'mrp_type',             label: 'MRP Type',                     type: 'select',   options: MRP_TYPE_OPTIONS },
  { key: 'procurement_type',     label: 'Procurement Type',             type: 'select',   options: PROCUREMENT_OPTIONS },
  { key: 'purchase_lead_time',   label: 'Purchase Lead Time (days)',    type: 'number' },
  { key: 'production_lead_time', label: 'Production Lead Time (days)',  type: 'number' },
  { key: 'safety_stock',         label: 'Safety Stock',                 type: 'number' },
  { key: 'reorder_point',        label: 'Reorder Point',                type: 'number' },
  { key: 'min_order_qty',        label: 'Min Order Qty',                type: 'number' },
  { key: 'max_order_qty',        label: 'Max Order Qty',                type: 'number' },
  { key: 'lot_size_type',        label: 'Lot Size Type',                type: 'select',   options: LOT_SIZE_OPTIONS },
  { key: 'fixed_lot_size',       label: 'Fixed Lot Size',               type: 'number' },
  { key: 'abc_class',            label: 'ABC Class',                    type: 'select',   options: ABC_CLASS_OPTIONS },
  { key: 'shelf_life_days',      label: 'Shelf Life (days)',            type: 'number' },
  { key: 'is_active',            label: 'Active',                       type: 'toggle',   editOnly: true },
  { key: 'notes',                label: 'Notes',                        type: 'textarea', rows: 2 },
]

export function MRPSection() {
  const [tab, setTab] = useState('RAW_MATERIAL')

  return (
    <div className="space-y-4">
      <Tabs tabs={MATERIAL_TABS} active={tab} onChange={setTab} size="sm" />
      <div className="pt-2">
        <CrudSection
          key={tab}
          endpoint={BASE}
          listParams={`material_type=${tab}`}
          hiddenValues={{ material_type: tab }}
          columns={COLS}
          fields={FIELDS}
          searchFields={['product_code', 'product_name']}
          entityLabel={MATERIAL_TABS.find(t => t.id === tab)?.label.replace(/s$/, '') ?? 'Material Master'}
        />
      </div>
    </div>
  )
}
