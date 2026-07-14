import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { formatMoney } from '../../lib/money'
import { LookupCell } from '../../lib/lookups'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from '../procurement/DocDetailModal'
import {
  customerOptions, currencyOptions, paymentTermOptions,
  warehouseOptions, uomOptions, productOptions, taxCodeOptions, documentTypeOptions,
} from '../master-data/useOptions'

const BASE = '/api/v1/sales'

const SQ_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',           key: 'code',           width: '130px' },
  { header: 'Type',           key: 'document_type_id', width: '200px',
    render: r => <LookupCell kind="documentType" id={r.document_type_id as number} /> },
  { header: 'Customer', key: 'customer_id', width: '200px',
    render: r => <LookupCell kind="customer" id={r.customer_id as number} /> },
  { header: 'Quotation Date', key: 'quotation_date', width: '120px' },
  { header: 'Valid Until',    key: 'valid_until',    width: '120px' },
  { header: 'Total',          key: 'total_amount',   width: '110px', align: 'right',
    render: r => formatMoney(r.total_amount as number) },
  { header: 'Converted SO',   key: 'converted_so_id', width: '120px',
    render: r => r.converted_so_id ? <span className="text-primary font-semibold">#{String(r.converted_so_id)}</span> : '—' },
  { header: 'Status', key: 'status', width: '120px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
]

const SQ_HEADER: FieldDef[] = [
  { key: 'code',                 label: 'Code',                type: 'text',     required: true, placeholder: 'SQ-001' },
  { key: 'document_type_id',     label: 'Type',                type: 'select',   loadOptions: documentTypeOptions('SQ') },
  { key: 'customer_id',          label: 'Customer',            type: 'select',   required: true, loadOptions: customerOptions() },
  { key: 'quotation_date',       label: 'Quotation Date',      type: 'date',     required: true },
  { key: 'valid_until',          label: 'Valid Until',         type: 'date' },
  { key: 'currency_id',          label: 'Currency',            type: 'select',   required: true, loadOptions: currencyOptions() },
  { key: 'exchange_rate',        label: 'Exchange Rate',       type: 'number',   min: 0, step: 0.000001 },
  { key: 'payment_term_id',      label: 'Payment Term',        type: 'select',   loadOptions: paymentTermOptions() },
  { key: 'warehouse_id',         label: 'Warehouse',           type: 'select',   required: true, loadOptions: warehouseOptions() },
  { key: 'customer_reference',   label: 'Customer Reference',  type: 'text' },
  { key: 'terms_and_conditions', label: 'Terms and Conditions', type: 'textarea', rows: 3, span: true },
  { key: 'notes',                label: 'Notes',               type: 'textarea', rows: 2, span: true },
]

const SQ_LINE_FIELDS: FieldDef[] = [
  { key: 'product_id',   label: 'Product',     type: 'select', required: true, loadOptions: productOptions() },
  { key: 'description',  label: 'Description', type: 'text' },
  { key: 'quantity',     label: 'Quantity',    type: 'number', required: true, min: 0, step: 0.001 },
  { key: 'uom_id',       label: 'UOM',         type: 'select', required: true, loadOptions: uomOptions() },
  { key: 'unit_price',   label: 'Unit Price',  type: 'number', min: 0, step: 0.01 },
  { key: 'discount_pct', label: 'Discount %',  type: 'number', min: 0, step: 0.01 },
  { key: 'tax_code_id',  label: 'Tax Code',    type: 'select', loadOptions: taxCodeOptions() },
  { key: 'notes',        label: 'Notes',       type: 'text',   span: true },
]

const SQ_LINE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',           key: 'line_number', width: '44px',  align: 'center' },
  { header: 'Product',     key: 'product_id',  width: '180px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Description', key: 'description' },
  { header: 'Qty',         key: 'quantity',    width: '70px',  align: 'right' },
  { header: 'UOM',         key: 'uom_id',      width: '90px',
    render: r => <LookupCell kind="uom" id={r.uom_id as number} /> },
  { header: 'Unit Price',  key: 'unit_price',  width: '100px', align: 'right',
    render: r => Number(r.unit_price ?? 0).toFixed(2) },
  { header: 'Line Total',  key: 'line_total',  width: '110px', align: 'right',
    render: r => Number(r.line_total ?? 0).toFixed(2) },
]

const SQ_WORKFLOW: WorkflowAction[] = [
  { label: 'Send to Customer', action: 'submit', variant: 'primary', icon: 'send',         visibleStatuses: ['DRAFT'] },
  { label: 'Accept → Create Sales Order', action: 'accept', variant: 'primary', icon: 'check_circle', visibleStatuses: ['SENT'] },
  { label: 'Mark Rejected',    action: 'reject', variant: 'danger',  icon: 'cancel',       visibleStatuses: ['SENT'],
    prompt: { field: 'reason', label: 'Rejection reason' } },
  { label: 'Cancel',           action: 'cancel', variant: 'danger',  icon: 'block',        visibleStatuses: ['DRAFT', 'SENT'] },
]

export function SQSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/quotations`)
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
          id="sq-search"
          placeholder="Search quotations..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" iconLeft="add" onClick={() => setModalDoc(null)} className="ml-auto">
          New Quotation
        </Button>
      </div>

      <Table
        columns={SQ_COLS}
        data={filtered}
        loading={loading}
        empty="No quotations found"
        onRowClick={row => setModalDoc(row)}
      />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen
          onClose={() => setModalDoc(undefined)}
          onRefresh={load}
          endpoint={`${BASE}/quotations`}
          doc={modalDoc}
          entityLabel="Quotation"
          docKind="SQ"
          listSubFields={['quotation_date', 'valid_until']}
          headerFields={SQ_HEADER}
          lineFields={SQ_LINE_FIELDS}
          lineColumns={SQ_LINE_COLS}
          workflowActions={SQ_WORKFLOW}
        />
      )}
    </>
  )
}
