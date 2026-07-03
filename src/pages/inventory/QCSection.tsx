import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { LookupCell } from '../../lib/lookups'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from '../procurement/DocDetailModal'
import { warehouseOptions, productOptions } from '../master-data/useOptions'

const BASE = '/api/v1/inventory'

const QC_RESULTS = [
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
]

const QC_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',           key: 'code',           width: '130px' },
  { header: 'Check Date',     key: 'check_date',     width: '120px' },
  { header: 'Reference Type', key: 'reference_type', width: '120px' },
  { header: 'Status', key: 'status', width: '130px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Notes', key: 'notes' },
]

const QC_HEADER: FieldDef[] = [
  { key: 'code',           label: 'Code',           type: 'text',   required: true, placeholder: 'QC-001' },
  { key: 'check_date',     label: 'Check Date',     type: 'date',   required: true },
  { key: 'warehouse_id',   label: 'Warehouse',      type: 'select', loadOptions: warehouseOptions() },
  { key: 'reference_type', label: 'Reference Type', type: 'text',   placeholder: 'GRN' },
  { key: 'reference_id',   label: 'Reference ID',   type: 'number', min: 1 },
  { key: 'notes',          label: 'Notes',          type: 'textarea', rows: 2, span: true },
]

const QC_LINE_FIELDS: FieldDef[] = [
  { key: 'product_id',       label: 'Product',          type: 'select', required: true, loadOptions: productOptions() },
  { key: 'qty_checked',      label: 'Qty Checked',      type: 'number', required: true, min: 0, step: 0.001 },
  { key: 'qty_passed',       label: 'Qty Passed',       type: 'number', min: 0, step: 0.001 },
  { key: 'qty_failed',       label: 'Qty Failed',       type: 'number', min: 0, step: 0.001 },
  { key: 'result',           label: 'Result',           type: 'select', options: QC_RESULTS },
  { key: 'rejection_reason', label: 'Rejection Reason', type: 'text',   span: true },
]

const QC_LINE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',           key: 'line_number',     width: '44px', align: 'center' },
  { header: 'Product',     key: 'product_id',      width: '180px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Checked',     key: 'qty_checked',     width: '80px', align: 'right' },
  { header: 'Passed',      key: 'qty_passed',      width: '80px', align: 'right' },
  { header: 'Failed',      key: 'qty_failed',      width: '80px', align: 'right' },
  { header: 'Result',      key: 'result',          width: '90px',
    render: r => {
      const v = String(r.result ?? '')
      if (!v) return null
      return <span className={v === 'PASSED' ? 'text-success font-semibold' : 'text-error font-semibold'}>{v}</span>
    },
  },
]

const QC_WORKFLOW: WorkflowAction[] = [
  { label: 'Start Inspection', action: 'start',  variant: 'outline', icon: 'play_arrow',   visibleStatuses: ['PENDING'] },
  { label: 'Submit Results',   action: 'submit', variant: 'primary',  icon: 'check_circle', visibleStatuses: ['IN_PROGRESS'] },
]

export function QCSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/quality-checks`)
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
      String(r.reference_type ?? '').toLowerCase().includes(q)
    )
  }, [data, search])

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Input id="qc-search" placeholder="Search quality checks..." iconLeft="search"
          value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Button variant="primary" size="sm" iconLeft="add" className="ml-auto"
          onClick={() => setModalDoc(null)}>
          New QC
        </Button>
      </div>

      <Table columns={QC_COLS} data={filtered} loading={loading}
        empty="No quality checks found" onRowClick={row => setModalDoc(row)} />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen onClose={() => setModalDoc(undefined)} onRefresh={load}
          endpoint={`${BASE}/quality-checks`}
          doc={modalDoc} entityLabel="Quality Check"
          listSubFields={['check_date', 'reference_type']}
          headerFields={QC_HEADER} lineFields={QC_LINE_FIELDS} lineColumns={QC_LINE_COLS}
          workflowActions={QC_WORKFLOW}
          editableStatuses={['PENDING', 'IN_PROGRESS']}
        />
      )}
    </>
  )
}
