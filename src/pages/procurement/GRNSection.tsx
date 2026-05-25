import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from './DocDetailModal'
import { supplierOptions, warehouseOptions, uomOptions, productOptions, purchaseOrderOptions } from '../master-data/useOptions'

const BASE = '/api/v1/procurement'

const GRN_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',         key: 'code',         width: '130px' },
  { header: 'Receipt Date', key: 'receipt_date', width: '120px' },
  { header: 'Status', key: 'status', width: '120px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Notes', key: 'notes' },
]

const GRN_HEADER: FieldDef[] = [
  { key: 'code',         label: 'Code',         type: 'text',   required: true, placeholder: 'GRN-001' },
  { key: 'po_id',        label: 'Purchase Order', type: 'select', loadOptions: purchaseOrderOptions() },
  { key: 'supplier_id',  label: 'Supplier',     type: 'select', required: true, loadOptions: supplierOptions() },
  { key: 'receipt_date', label: 'Receipt Date', type: 'date',   required: true },
  { key: 'warehouse_id', label: 'Warehouse',    type: 'select', required: true, loadOptions: warehouseOptions() },
  { key: 'notes',        label: 'Notes',        type: 'textarea', rows: 2, span: true },
]

const GRN_LINE_FIELDS: FieldDef[] = [
  { key: 'product_id', label: 'Product',    type: 'select', required: true, loadOptions: productOptions() },
  { key: 'quantity',   label: 'Quantity',   type: 'number', required: true, min: 0, step: 0.001 },
  { key: 'uom_id',     label: 'UOM',        type: 'select', loadOptions: uomOptions() },
  { key: 'unit_cost',  label: 'Unit Cost',  type: 'number', min: 0, step: 0.01 },
  { key: 'notes',      label: 'Notes',      type: 'text', span: true },
]

const GRN_LINE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',          key: 'line_number', width: '44px', align: 'center' },
  { header: 'Product ID', key: 'product_id',  width: '90px' },
  { header: 'Quantity',   key: 'quantity',    width: '80px', align: 'right' },
  { header: 'Unit Cost',  key: 'unit_cost',   width: '100px', align: 'right',
    render: r => Number(r.unit_cost ?? 0).toFixed(2) },
  { header: 'Total Cost', key: 'total_cost',  width: '110px', align: 'right',
    render: r => Number(r.total_cost ?? 0).toFixed(2) },
]

const GRN_WORKFLOW: WorkflowAction[] = [
  { label: 'Confirm Receipt', action: 'confirm', variant: 'primary', icon: 'check_circle', visibleStatuses: ['DRAFT'] },
]

export function GRNSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/goods-receipts`)
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
          id="grn-search"
          placeholder="Search goods receipts..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" iconLeft="add" onClick={() => setModalDoc(null)} className="ml-auto">
          New GRN
        </Button>
      </div>

      <Table
        columns={GRN_COLS}
        data={filtered}
        loading={loading}
        empty="No goods receipts found"
        onRowClick={row => setModalDoc(row)}
      />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen
          onClose={() => setModalDoc(undefined)}
          onRefresh={load}
          endpoint={`${BASE}/goods-receipts`}
          doc={modalDoc}
          entityLabel="Goods Receipt"
          listSubFields={['receipt_date']}
          headerFields={GRN_HEADER}
          lineFields={GRN_LINE_FIELDS}
          lineColumns={GRN_LINE_COLS}
          workflowActions={GRN_WORKFLOW}
        />
      )}
    </>
  )
}
