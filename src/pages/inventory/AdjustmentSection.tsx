import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { LookupCell } from '../../lib/lookups'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from '../procurement/DocDetailModal'
import { warehouseOptions, productOptions, uomOptions, documentTypeOptions } from '../master-data/useOptions'

const BASE = '/api/v1/inventory'

const SA_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',             key: 'code',            width: '130px' },
  { header: 'Type',             key: 'document_type_id', width: '200px',
    render: r => <LookupCell kind="documentType" id={r.document_type_id as number} /> },
  { header: 'Warehouse', key: 'warehouse_id', width: '160px',
    render: r => <LookupCell kind="warehouse" id={r.warehouse_id as number} /> },
  { header: 'Adjustment Date',  key: 'adjustment_date', width: '140px' },
  { header: 'Status', key: 'status', width: '120px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Notes', key: 'notes' },
]

const SA_HEADER: FieldDef[] = [
  { key: 'code',             label: 'Code',            type: 'text',   required: true, placeholder: 'ADJ-001' },
  { key: 'document_type_id', label: 'Type',            type: 'select', loadOptions: documentTypeOptions('SA') },
  { key: 'adjustment_date', label: 'Adjustment Date', type: 'date',   required: true },
  { key: 'warehouse_id',    label: 'Warehouse',       type: 'select', required: true, loadOptions: warehouseOptions() },
  { key: 'notes',           label: 'Notes',           type: 'textarea', rows: 2, span: true },
]

const SA_LINE_FIELDS: FieldDef[] = [
  { key: 'product_id', label: 'Product',    type: 'select', required: true, loadOptions: productOptions() },
  { key: 'quantity',   label: 'Quantity',   type: 'number', required: true, step: 0.001 },
  { key: 'uom_id',     label: 'UOM',        type: 'select', loadOptions: uomOptions() },
  { key: 'unit_cost',  label: 'Unit Cost',  type: 'number', min: 0, step: 0.01 },
  { key: 'notes',      label: 'Notes',      type: 'text',   span: true },
]

const SA_LINE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',          key: 'line_number', width: '44px', align: 'center' },
  { header: 'Product',    key: 'product_id',  width: '180px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Qty',        key: 'quantity',    width: '80px', align: 'right' },
  { header: 'UOM',        key: 'uom_id',      width: '90px',
    render: r => <LookupCell kind="uom" id={r.uom_id as number} /> },
  { header: 'Unit Cost',  key: 'unit_cost',   width: '100px', align: 'right',
    render: r => Number(r.unit_cost ?? 0).toFixed(2) },
]

const SA_WORKFLOW: WorkflowAction[] = [
  { label: 'Confirm Adjustment', action: 'confirm', variant: 'primary', icon: 'check_circle', visibleStatuses: ['DRAFT'] },
  { label: 'Cancel',             action: 'cancel',  variant: 'danger',  icon: 'block',        visibleStatuses: ['DRAFT'] },
]

export function AdjustmentSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/adjustments`)
      .then(rows => setData(Array.isArray(rows) ? rows : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(r =>
      String(r.code ?? '').toLowerCase().includes(q) ||
      String(r.adjust_reason ?? '').toLowerCase().includes(q)
    )
  }, [data, search])

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Input id="sa-search" placeholder="Search adjustments..." iconLeft="search"
          value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Button variant="primary" size="sm" iconLeft="add" className="ml-auto"
          onClick={() => setModalDoc(null)}>
          New Adjustment
        </Button>
      </div>

      <Table columns={SA_COLS} data={filtered} loading={loading}
        empty="No stock adjustments found" onRowClick={row => setModalDoc(row)} />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen onClose={() => setModalDoc(undefined)} onRefresh={load}
          endpoint={`${BASE}/adjustments`}
          doc={modalDoc} entityLabel="Stock Adjustment"
          docKind="SA"
          listSubFields={['adjustment_date', 'adjust_reason']}
          headerFields={SA_HEADER} lineFields={SA_LINE_FIELDS} lineColumns={SA_LINE_COLS}
          workflowActions={SA_WORKFLOW}
        />
      )}
    </>
  )
}
