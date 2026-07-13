import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { LookupCell } from '../../lib/lookups'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from './DocDetailModal'
import { currencyOptions, departmentOptions, uomOptions, productOptions, documentTypeOptions } from '../master-data/useOptions'

const BASE = '/api/v1/procurement'

const PR_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',        key: 'code',         width: '130px' },
  { header: 'Type',        key: 'document_type_id', width: '200px',
    render: r => <LookupCell kind="documentType" id={r.document_type_id as number} /> },
  { header: 'Date',        key: 'request_date', width: '110px' },
  { header: 'Required By', key: 'required_date', width: '110px' },
  { header: 'Status', key: 'status', width: '150px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Notes', key: 'notes' },
]

const PR_HEADER: FieldDef[] = [
  { key: 'code',             label: 'Code',         type: 'text', required: true, placeholder: 'PR-001' },
  { key: 'document_type_id', label: 'Type',         type: 'select', loadOptions: documentTypeOptions('PR') },
  { key: 'request_date',  label: 'Request Date',  type: 'date', required: true },
  { key: 'required_date', label: 'Required By',   type: 'date' },
  { key: 'department_id', label: 'Department',    type: 'select', loadOptions: departmentOptions() },
  { key: 'notes',         label: 'Notes',         type: 'textarea', rows: 2, span: true },
]

const PR_LINE_FIELDS: FieldDef[] = [
  { key: 'product_id',      label: 'Product',      type: 'select', required: true, loadOptions: productOptions() },
  { key: 'description',     label: 'Description',  type: 'text' },
  { key: 'quantity',        label: 'Quantity',     type: 'number', required: true, min: 0, step: 0.001 },
  { key: 'uom_id',          label: 'UOM',          type: 'select', loadOptions: uomOptions() },
  { key: 'estimated_price', label: 'Est. Price',   type: 'number', min: 0, step: 0.01 },
  { key: 'currency_id',     label: 'Currency',     type: 'select', loadOptions: currencyOptions() },
  { key: 'notes',           label: 'Notes',        type: 'text', span: true },
]

const PR_LINE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',           key: 'line_number',     width: '44px', align: 'center' },
  { header: 'Product',     key: 'product_id',      width: '180px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Description', key: 'description' },
  { header: 'Qty',         key: 'quantity',        width: '70px', align: 'right' },
  { header: 'UOM',         key: 'uom_id',          width: '90px',
    render: r => <LookupCell kind="uom" id={r.uom_id as number} /> },
  { header: 'Est. Price',  key: 'estimated_price', width: '100px', align: 'right',
    render: r => Number(r.estimated_price ?? 0).toFixed(2) },
]

const PR_WORKFLOW: WorkflowAction[] = [
  { label: 'Submit for Approval', action: 'submit',  variant: 'primary', icon: 'send',        visibleStatuses: ['DRAFT'] },
  { label: 'Approve',             action: 'approve', variant: 'primary', icon: 'check_circle', visibleStatuses: ['PENDING_APPROVAL'] },
  { label: 'Reject',              action: 'reject',  variant: 'danger',  icon: 'cancel',       visibleStatuses: ['PENDING_APPROVAL'] },
  { label: 'Cancel',              action: 'cancel',  variant: 'danger',  icon: 'block',        visibleStatuses: ['DRAFT', 'PENDING_APPROVAL'] },
]

export function PRSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/purchase-requests`)
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
      String(r.notes ?? '').toLowerCase().includes(q)
    )
  }, [data, search])

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Input
          id="pr-search"
          placeholder="Search purchase requests..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" iconLeft="add" onClick={() => setModalDoc(null)} className="ml-auto">
          New PR
        </Button>
      </div>

      <Table
        columns={PR_COLS}
        data={filtered}
        loading={loading}
        empty="No purchase requests found"
        onRowClick={row => setModalDoc(row)}
      />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen
          onClose={() => setModalDoc(undefined)}
          onRefresh={load}
          endpoint={`${BASE}/purchase-requests`}
          doc={modalDoc}
          entityLabel="Purchase Request"
          docKind="PR"
          listSubFields={['request_date', 'required_date']}
          headerFields={PR_HEADER}
          lineFields={PR_LINE_FIELDS}
          lineColumns={PR_LINE_COLS}
          workflowActions={PR_WORKFLOW}
        />
      )}
    </>
  )
}
