import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { LookupCell } from '../../lib/lookups'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from '../procurement/DocDetailModal'
import { productionOrderOptions, costEstimateOptions } from '../master-data/useOptions'

const BASE = '/api/v1/manufacturing'

const POSTCOST_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',        key: 'code',             width: '120px' },
  { header: 'Order',       key: 'order_id',         width: '120px',
    render: r => <LookupCell kind="productionOrder" id={r.order_id as number} /> },
  { header: 'Actual Total', key: 'total_actual_cost', width: '120px', align: 'right',
    render: r => Number(r.total_actual_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
  { header: 'Est. Total',  key: 'total_estimated_cost', width: '120px', align: 'right',
    render: r => Number(r.total_estimated_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
  { header: 'Variance',    key: 'variance_amount',  width: '110px', align: 'right',
    render: r => {
      const v = Number(r.variance_amount ?? 0)
      return (
        <span className={v > 0 ? 'text-error' : v < 0 ? 'text-success' : ''}>
          {v > 0 ? '+' : ''}{v.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      )
    } },
  { header: 'Var %', key: 'variance_pct', width: '80px', align: 'right',
    render: r => `${Number(r.variance_pct ?? 0).toFixed(1)}%` },
  { header: 'Status', key: 'status', width: '110px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
]

const HEADER_FIELDS: FieldDef[] = [
  { key: 'code',        label: 'Code',             type: 'text',   required: true, placeholder: 'PC-00001' },
  { key: 'order_id',    label: 'Production Order', type: 'select', required: true, loadOptions: productionOrderOptions() },
  { key: 'estimate_id', label: 'Cost Estimate',    type: 'select', loadOptions: costEstimateOptions() },
  { key: 'notes',       label: 'Notes',            type: 'textarea', rows: 2, span: true },
  // Computed actuals — visible only when viewing existing record
  { key: 'actual_material_cost',  label: 'Actual Material Cost',  type: 'number', editOnly: true },
  { key: 'actual_resource_cost',  label: 'Actual Resource Cost',  type: 'number', editOnly: true },
  { key: 'actual_overhead_cost',  label: 'Actual Overhead Cost',  type: 'number', editOnly: true },
  { key: 'total_actual_cost',     label: 'Total Actual Cost',     type: 'number', editOnly: true, span: true },
  // Estimated costs
  { key: 'estimated_material_cost', label: 'Est. Material Cost',  type: 'number', editOnly: true },
  { key: 'estimated_resource_cost', label: 'Est. Resource Cost',  type: 'number', editOnly: true },
  { key: 'estimated_overhead_cost', label: 'Est. Overhead Cost',  type: 'number', editOnly: true },
  { key: 'total_estimated_cost',    label: 'Total Estimated Cost', type: 'number', editOnly: true, span: true },
  // Variance
  { key: 'variance_amount', label: 'Variance Amount', type: 'number', editOnly: true },
  { key: 'variance_pct',    label: 'Variance %',      type: 'number', editOnly: true },
]

const WORKFLOW: WorkflowAction[] = [
  { label: 'Finalize', action: 'finalize', variant: 'primary', icon: 'lock', visibleStatuses: ['DRAFT'] },
]

export function PostCostSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/post-costs`)
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
          id="pc-search"
          placeholder="Search post-cost reports..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" iconLeft="add" onClick={() => setModalDoc(null)} className="ml-auto">
          New Post-Cost
        </Button>
      </div>

      <Table
        columns={POSTCOST_COLS}
        data={filtered}
        loading={loading}
        empty="No post-cost reports found"
        onRowClick={row => setModalDoc(row)}
      />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen
          onClose={() => setModalDoc(undefined)}
          onRefresh={load}
          endpoint={`${BASE}/post-costs`}
          doc={modalDoc}
          entityLabel="Post-Cost Report"
          headerFields={HEADER_FIELDS}
          workflowActions={WORKFLOW}
          editableStatuses={['DRAFT']}
        />
      )}
    </>
  )
}
