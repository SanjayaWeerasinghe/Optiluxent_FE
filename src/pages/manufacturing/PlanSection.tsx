import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from '../procurement/DocDetailModal'
import {
  productOptions, uomOptions, bomOptions, routingOptions,
  warehouseOptions, costEstimateOptions,
} from '../master-data/useOptions'

const BASE = '/api/v1/manufacturing'

const PLAN_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',        key: 'code',               width: '120px' },
  { header: 'Product',     key: 'product_id',         width: '90px' },
  { header: 'Planned Qty', key: 'planned_qty',        width: '100px', align: 'right' },
  { header: 'Start Date',  key: 'planned_start_date', width: '110px' },
  { header: 'End Date',    key: 'planned_end_date',   width: '110px' },
  { header: 'Status', key: 'status', width: '120px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
]

const HEADER_FIELDS: FieldDef[] = [
  { key: 'code',               label: 'Code',          type: 'text',     required: true, placeholder: 'PP-00001' },
  { key: 'product_id',         label: 'Product',       type: 'select',   required: true, loadOptions: productOptions() },
  { key: 'uom_id',             label: 'UOM',           type: 'select',   required: true, loadOptions: uomOptions() },
  { key: 'planned_qty',        label: 'Planned Qty',   type: 'number',   min: 0, step: 0.001 },
  { key: 'warehouse_id',       label: 'Warehouse',     type: 'select',   required: true, loadOptions: warehouseOptions() },
  { key: 'bom_id',             label: 'BOM',           type: 'select',   loadOptions: bomOptions() },
  { key: 'routing_id',         label: 'Routing',       type: 'select',   loadOptions: routingOptions() },
  { key: 'estimate_id',        label: 'Cost Estimate', type: 'select',   loadOptions: costEstimateOptions() },
  { key: 'planned_start_date', label: 'Planned Start', type: 'date' },
  { key: 'planned_end_date',   label: 'Planned End',   type: 'date' },
  { key: 'notes',              label: 'Notes',         type: 'textarea', rows: 2, span: true },
]

const WORKFLOW: WorkflowAction[] = [
  { label: 'Release Plan', action: 'release', variant: 'primary', icon: 'play_arrow', visibleStatuses: ['DRAFT'] },
  { label: 'Cancel',       action: 'cancel',  variant: 'danger',  icon: 'block',      visibleStatuses: ['DRAFT', 'RELEASED'] },
]

export function PlanSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/plans`)
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
          id="pp-search"
          placeholder="Search production plans..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" iconLeft="add" onClick={() => setModalDoc(null)} className="ml-auto">
          New Plan
        </Button>
      </div>

      <Table
        columns={PLAN_COLS}
        data={filtered}
        loading={loading}
        empty="No production plans found"
        onRowClick={row => setModalDoc(row)}
      />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen
          onClose={() => setModalDoc(undefined)}
          onRefresh={load}
          endpoint={`${BASE}/plans`}
          doc={modalDoc}
          entityLabel="Production Plan"
          listSubFields={['planned_start_date', 'planned_end_date']}
          headerFields={HEADER_FIELDS}
          workflowActions={WORKFLOW}
          editableStatuses={['DRAFT']}
        />
      )}
    </>
  )
}
