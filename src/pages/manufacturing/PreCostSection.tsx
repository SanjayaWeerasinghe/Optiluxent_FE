import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from '../procurement/DocDetailModal'
import {
  productOptions, uomOptions, bomOptions, routingOptions, workCenterOptions,
} from '../master-data/useOptions'

const BASE = '/api/v1/manufacturing'

const ESTIMATE_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',        key: 'code',                  width: '120px' },
  { header: 'Product',     key: 'product_id',            width: '90px' },
  { header: 'Planned Qty', key: 'planned_qty',           width: '100px', align: 'right' },
  { header: 'Est. Material', key: 'estimated_material_cost', width: '120px', align: 'right',
    render: r => Number(r.estimated_material_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
  { header: 'Est. Resource', key: 'estimated_resource_cost', width: '120px', align: 'right',
    render: r => Number(r.estimated_resource_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
  { header: 'Total Est.', key: 'total_estimated_cost', width: '110px', align: 'right',
    render: r => Number(r.total_estimated_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
  { header: 'Status', key: 'status', width: '110px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
]

const LINE_TYPES = [
  { value: 'MATERIAL',  label: 'Material' },
  { value: 'RESOURCE',  label: 'Resource / Labor' },
  { value: 'OVERHEAD',  label: 'Overhead' },
]

const HEADER_FIELDS: FieldDef[] = [
  { key: 'code',               label: 'Code',             type: 'text',     required: true, placeholder: 'CE-00001' },
  { key: 'product_id',         label: 'Product',          type: 'select',   required: true, loadOptions: productOptions() },
  { key: 'uom_id',             label: 'UOM',              type: 'select',   required: true, loadOptions: uomOptions() },
  { key: 'planned_qty',        label: 'Planned Qty',      type: 'number',   min: 0, step: 0.001 },
  { key: 'bom_id',             label: 'BOM',              type: 'select',   loadOptions: bomOptions() },
  { key: 'routing_id',         label: 'Routing',          type: 'select',   loadOptions: routingOptions() },
  { key: 'planned_start_date', label: 'Planned Start',    type: 'date' },
  { key: 'planned_end_date',   label: 'Planned End',      type: 'date' },
  { key: 'notes',              label: 'Notes',            type: 'textarea', rows: 2, span: true },
  // Computed totals — shown in view mode only (always read-only; backend owns these values)
  { key: 'estimated_material_cost', label: 'Est. Material Cost', type: 'number', editOnly: true },
  { key: 'estimated_resource_cost', label: 'Est. Resource Cost', type: 'number', editOnly: true },
  { key: 'estimated_overhead_cost', label: 'Est. Overhead Cost', type: 'number', editOnly: true },
  { key: 'total_estimated_cost',    label: 'Total Estimated',    type: 'number', editOnly: true, span: true },
]

const LINE_FIELDS: FieldDef[] = [
  { key: 'line_type',     label: 'Type',        type: 'select', options: LINE_TYPES, required: true },
  { key: 'product_id',    label: 'Product',     type: 'select', loadOptions: productOptions() },
  { key: 'work_center_id', label: 'Work Center', type: 'select', loadOptions: workCenterOptions() },
  { key: 'description',   label: 'Description', type: 'text', span: true },
  { key: 'quantity',      label: 'Quantity',    type: 'number', min: 0, step: 0.001 },
  { key: 'uom_id',        label: 'UOM',         type: 'select', loadOptions: uomOptions() },
  { key: 'unit_cost',     label: 'Unit Cost',   type: 'number', min: 0, step: 0.01 },
  { key: 'notes',         label: 'Notes',       type: 'text',   span: true },
]

const LINE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',    key: 'line_number', width: '44px', align: 'center' },
  { header: 'Type', key: 'line_type',  width: '100px' },
  { header: 'Description', key: 'description' },
  { header: 'Qty',       key: 'quantity',   width: '70px',  align: 'right' },
  { header: 'Unit Cost', key: 'unit_cost',  width: '90px',  align: 'right',
    render: r => Number(r.unit_cost ?? 0).toFixed(2) },
  { header: 'Total Cost', key: 'total_cost', width: '100px', align: 'right',
    render: r => Number(r.total_cost ?? 0).toFixed(2) },
]

const WORKFLOW: WorkflowAction[] = [
  { label: 'Approve',  action: 'approve', variant: 'primary', icon: 'check_circle', visibleStatuses: ['DRAFT'] },
  { label: 'Cancel',   action: 'cancel',  variant: 'danger',  icon: 'block',        visibleStatuses: ['DRAFT', 'APPROVED'] },
]

export function PreCostSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/pre-costs`)
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
          id="ce-search"
          placeholder="Search cost estimates..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" iconLeft="add" onClick={() => setModalDoc(null)} className="ml-auto">
          New Estimate
        </Button>
      </div>

      <Table
        columns={ESTIMATE_COLS}
        data={filtered}
        loading={loading}
        empty="No cost estimates found"
        onRowClick={row => setModalDoc(row)}
      />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen
          onClose={() => setModalDoc(undefined)}
          onRefresh={load}
          endpoint={`${BASE}/pre-costs`}
          doc={modalDoc}
          entityLabel="Cost Estimate"
          listSubFields={['planned_start_date', 'planned_end_date']}
          headerFields={HEADER_FIELDS}
          lineFields={LINE_FIELDS}
          lineColumns={LINE_COLS}
          workflowActions={WORKFLOW}
          editableStatuses={['DRAFT']}
        />
      )}
    </>
  )
}
