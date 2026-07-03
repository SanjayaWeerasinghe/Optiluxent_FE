import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { LookupCell } from '../../lib/lookups'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from '../procurement/DocDetailModal'
import { warehouseOptions, departmentOptions, productOptions, uomOptions, manufacturingOrderOptions } from '../master-data/useOptions'

const BASE = '/api/v1/inventory'

const MR_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',       key: 'code',        width: '130px' },
  { header: 'Needed By',  key: 'needed_date', width: '120px' },
  { header: 'Status', key: 'status', width: '130px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Notes', key: 'notes' },
]

const MR_HEADER: FieldDef[] = [
  { key: 'code',          label: 'Code',                type: 'text',   required: true, placeholder: 'MR-001' },
  { key: 'mo_id',         label: 'Manufacturing Order', type: 'select', loadOptions: manufacturingOrderOptions() },
  { key: 'needed_date',   label: 'Needed By',           type: 'date',   required: true },
  { key: 'warehouse_id',  label: 'Warehouse',           type: 'select', required: true, loadOptions: warehouseOptions() },
  { key: 'department_id', label: 'Department',          type: 'select', loadOptions: departmentOptions() },
  { key: 'notes',         label: 'Notes',               type: 'textarea', rows: 2, span: true },
]

const MR_LINE_FIELDS: FieldDef[] = [
  { key: 'product_id',    label: 'Product',      type: 'select', required: true, loadOptions: productOptions() },
  { key: 'requested_qty', label: 'Requested Qty', type: 'number', required: true, min: 0, step: 0.001 },
  { key: 'uom_id',        label: 'UOM',          type: 'select', loadOptions: uomOptions() },
  { key: 'notes',         label: 'Notes',        type: 'text',   span: true },
]

const MR_LINE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',            key: 'line_number',  width: '44px', align: 'center' },
  { header: 'Product',      key: 'product_id',   width: '180px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Requested',    key: 'requested_qty', width: '100px', align: 'right' },
  { header: 'UOM',          key: 'uom_id',       width: '90px',
    render: r => <LookupCell kind="uom" id={r.uom_id as number} /> },
  { header: 'Issued',       key: 'issued_qty',   width: '80px', align: 'right' },
  { header: 'Notes',        key: 'notes' },
]

const MR_WORKFLOW: WorkflowAction[] = [
  { label: 'Approve', action: 'approve', variant: 'primary', icon: 'check_circle', visibleStatuses: ['DRAFT'] },
  { label: 'Reject',  action: 'reject',  variant: 'danger',  icon: 'cancel',       visibleStatuses: ['DRAFT'] },
]

export function MRSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/material-requests`)
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
        <Input id="mr-search" placeholder="Search material requests..." iconLeft="search"
          value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Button variant="primary" size="sm" iconLeft="add" className="ml-auto"
          onClick={() => setModalDoc(null)}>
          New MR
        </Button>
      </div>

      <Table columns={MR_COLS} data={filtered} loading={loading}
        empty="No material requests found" onRowClick={row => setModalDoc(row)} />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen onClose={() => setModalDoc(undefined)} onRefresh={load}
          endpoint={`${BASE}/material-requests`}
          doc={modalDoc} entityLabel="Material Request"
          listSubFields={['needed_date']}
          headerFields={MR_HEADER} lineFields={MR_LINE_FIELDS} lineColumns={MR_LINE_COLS}
          workflowActions={MR_WORKFLOW}
        />
      )}
    </>
  )
}
