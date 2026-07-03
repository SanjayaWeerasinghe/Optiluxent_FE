import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { LookupCell } from '../../lib/lookups'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from '../procurement/DocDetailModal'
import {
  customerOptions, warehouseOptions, uomOptions, productOptions, salesOrderOptions,
} from '../master-data/useOptions'

const BASE = '/api/v1/sales'

const DO_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',          key: 'code',          width: '130px' },
  { header: 'Delivery Date', key: 'delivery_date', width: '120px' },
  { header: 'Status', key: 'status', width: '120px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
]

const DO_HEADER: FieldDef[] = [
  { key: 'code',          label: 'Code',          type: 'text',     required: true, placeholder: 'DO-001' },
  { key: 'so_id',         label: 'Sales Order',   type: 'select',   loadOptions: salesOrderOptions() },
  { key: 'customer_id',   label: 'Customer',      type: 'select',   required: true, loadOptions: customerOptions() },
  { key: 'delivery_date', label: 'Delivery Date', type: 'date',     required: true },
  { key: 'warehouse_id',  label: 'Warehouse',     type: 'select',   required: true, loadOptions: warehouseOptions() },
  { key: 'notes',         label: 'Notes',         type: 'textarea', rows: 2, span: true },
]

const DO_LINE_FIELDS: FieldDef[] = [
  { key: 'product_id', label: 'Product',  type: 'select', required: true, loadOptions: productOptions() },
  { key: 'uom_id',     label: 'UOM',      type: 'select', required: true, loadOptions: uomOptions() },
  { key: 'quantity',   label: 'Quantity', type: 'number', required: true, min: 0, step: 0.001 },
  { key: 'unit_cost',  label: 'Unit Cost', type: 'number', min: 0, step: 0.01 },
  { key: 'notes',      label: 'Notes',    type: 'text',   span: true },
]

const DO_LINE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',         key: 'line_number', width: '44px',  align: 'center' },
  { header: 'Product',   key: 'product_id',  width: '180px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Qty',       key: 'quantity',    width: '80px',  align: 'right' },
  { header: 'UOM',       key: 'uom_id',      width: '90px',
    render: r => <LookupCell kind="uom" id={r.uom_id as number} /> },
  { header: 'Unit Cost', key: 'unit_cost',   width: '100px', align: 'right',
    render: r => Number(r.unit_cost ?? 0).toFixed(2) },
  { header: 'Total Cost', key: 'total_cost', width: '110px', align: 'right',
    render: r => Number(r.total_cost ?? 0).toFixed(2) },
]

const DO_WORKFLOW: WorkflowAction[] = [
  { label: 'Confirm Delivery', action: 'confirm', variant: 'primary', icon: 'local_shipping', visibleStatuses: ['DRAFT'] },
]

export function DeliverySection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/deliveries`)
      .then(rows => setData(Array.isArray(rows) ? rows : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(r => String(r.code ?? '').toLowerCase().includes(q))
  }, [data, search])

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Input
          id="do-search"
          placeholder="Search deliveries..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" iconLeft="add" onClick={() => setModalDoc(null)} className="ml-auto">
          New Delivery
        </Button>
      </div>

      <Table
        columns={DO_COLS}
        data={filtered}
        loading={loading}
        empty="No delivery orders found"
        onRowClick={row => setModalDoc(row)}
      />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen
          onClose={() => setModalDoc(undefined)}
          onRefresh={load}
          endpoint={`${BASE}/deliveries`}
          doc={modalDoc}
          entityLabel="Delivery Order"
          listSubFields={['delivery_date']}
          headerFields={DO_HEADER}
          lineFields={DO_LINE_FIELDS}
          lineColumns={DO_LINE_COLS}
          workflowActions={DO_WORKFLOW}
          editableStatuses={['DRAFT']}
        />
      )}
    </>
  )
}
