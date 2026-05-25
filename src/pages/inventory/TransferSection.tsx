import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from '../procurement/DocDetailModal'
import { warehouseOptions, productOptions, uomOptions } from '../master-data/useOptions'

const BASE = '/api/v1/inventory'

const GT_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',          key: 'code',          width: '130px' },
  { header: 'Transfer Date', key: 'transfer_date', width: '120px' },
  { header: 'Status', key: 'status', width: '130px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Notes', key: 'notes' },
]

const GT_HEADER: FieldDef[] = [
  { key: 'code',              label: 'Code',           type: 'text',   required: true, placeholder: 'GT-001' },
  { key: 'from_warehouse_id', label: 'From Warehouse', type: 'select', required: true, loadOptions: warehouseOptions() },
  { key: 'to_warehouse_id',   label: 'To Warehouse',   type: 'select', required: true, loadOptions: warehouseOptions() },
  { key: 'transfer_date',     label: 'Transfer Date',  type: 'date',   required: true },
  { key: 'notes',             label: 'Notes',          type: 'textarea', rows: 2, span: true },
]

const GT_LINE_FIELDS: FieldDef[] = [
  { key: 'product_id', label: 'Product',  type: 'select', required: true, loadOptions: productOptions() },
  { key: 'quantity',   label: 'Quantity', type: 'number', required: true, min: 0, step: 0.001 },
  { key: 'uom_id',     label: 'UOM',      type: 'select', loadOptions: uomOptions() },
  { key: 'notes',      label: 'Notes',    type: 'text',   span: true },
]

const GT_LINE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',           key: 'line_number',  width: '44px', align: 'center' },
  { header: 'Product ID',  key: 'product_id',   width: '90px' },
  { header: 'Qty',         key: 'quantity',     width: '80px', align: 'right' },
  { header: 'Received',    key: 'received_qty', width: '90px', align: 'right' },
  { header: 'Notes',       key: 'notes' },
]

const GT_WORKFLOW: WorkflowAction[] = [
  { label: 'Send',    action: 'send',    variant: 'primary', icon: 'local_shipping', visibleStatuses: ['DRAFT'] },
  { label: 'Receive', action: 'receive', variant: 'primary', icon: 'move_to_inbox',  visibleStatuses: ['IN_TRANSIT'] },
  { label: 'Cancel',  action: 'cancel',  variant: 'danger',  icon: 'block',          visibleStatuses: ['DRAFT', 'IN_TRANSIT'] },
]

export function TransferSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/transfers`)
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
        <Input id="gt-search" placeholder="Search transfers..." iconLeft="search"
          value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Button variant="primary" size="sm" iconLeft="add" className="ml-auto"
          onClick={() => setModalDoc(null)}>
          New Transfer
        </Button>
      </div>

      <Table columns={GT_COLS} data={filtered} loading={loading}
        empty="No transfers found" onRowClick={row => setModalDoc(row)} />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen onClose={() => setModalDoc(undefined)} onRefresh={load}
          endpoint={`${BASE}/transfers`}
          doc={modalDoc} entityLabel="Goods Transfer"
          listSubFields={['transfer_date']}
          headerFields={GT_HEADER} lineFields={GT_LINE_FIELDS} lineColumns={GT_LINE_COLS}
          workflowActions={GT_WORKFLOW}
          editableStatuses={['DRAFT']}
        />
      )}
    </>
  )
}
