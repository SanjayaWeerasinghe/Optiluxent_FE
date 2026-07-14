import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { LookupCell } from '../../lib/lookups'
import { type FieldDef } from '../master-data/CrudSection'
import { DocDetailModal, type WorkflowAction } from './DocDetailModal'
import {
  supplierOptions, currencyOptions, paymentTermOptions,
  uomOptions, productOptions, taxCodeOptions, purchaseOrderOptions, documentTypeOptions,
} from '../master-data/useOptions'

const BASE = '/api/v1/procurement'

const INV_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',        key: 'code',                width: '130px' },
  { header: 'Supplier', key: 'supplier_id', width: '200px',
    render: r => <LookupCell kind="supplier" id={r.supplier_id as number} /> },
  { header: 'Type',        key: 'document_type_id', width: '200px',
    render: r => <LookupCell kind="documentType" id={r.document_type_id as number} /> },
  { header: 'Supplier Inv.', key: 'supplier_invoice_no', width: '130px' },
  { header: 'Invoice Date', key: 'invoice_date',       width: '110px' },
  { header: 'Due Date',    key: 'due_date',            width: '110px' },
  { header: 'Total',       key: 'total_amount',        width: '110px', align: 'right',
    render: r => Number(r.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
  { header: 'Status', key: 'status', width: '120px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
]

const INV_HEADER: FieldDef[] = [
  { key: 'code',                  label: 'Code',                  type: 'text',   required: true, placeholder: 'PINV-001' },
  { key: 'document_type_id',      label: 'Type',                  type: 'select', loadOptions: documentTypeOptions('PI') },
  { key: 'supplier_id',           label: 'Supplier',              type: 'select', required: true, loadOptions: supplierOptions() },
  { key: 'po_id',                 label: 'Purchase Order',        type: 'select', required: true, loadOptions: purchaseOrderOptions() },
  { key: 'invoice_date',          label: 'Invoice Date',          type: 'date',   required: true },
  { key: 'due_date',              label: 'Due Date',              type: 'date' },
  { key: 'supplier_invoice_no',   label: 'Supplier Invoice No.',  type: 'text' },
  { key: 'supplier_invoice_date', label: 'Supplier Invoice Date', type: 'date' },
  { key: 'currency_id',           label: 'Currency',              type: 'select', required: true, loadOptions: currencyOptions() },
  { key: 'exchange_rate',         label: 'Exchange Rate',         type: 'number', min: 0, step: 0.000001 },
  { key: 'payment_term_id',       label: 'Payment Term',          type: 'select', loadOptions: paymentTermOptions() },
  { key: 'notes',                 label: 'Notes',                 type: 'textarea', rows: 2, span: true },
]

const INV_LINE_FIELDS: FieldDef[] = [
  { key: 'product_id',   label: 'Product',      type: 'select', required: true, loadOptions: productOptions() },
  { key: 'description',  label: 'Description',  type: 'text' },
  { key: 'quantity',     label: 'Quantity',     type: 'number', required: true, min: 0, step: 0.001 },
  { key: 'uom_id',       label: 'UOM',          type: 'select', loadOptions: uomOptions() },
  { key: 'unit_price',   label: 'Unit Price',   type: 'number', min: 0, step: 0.01 },
  { key: 'discount_pct', label: 'Discount %',   type: 'number', min: 0, step: 0.01 },
  { key: 'tax_code_id',  label: 'Tax Code',     type: 'select', loadOptions: taxCodeOptions() },
  { key: 'notes',        label: 'Notes',        type: 'text', span: true },
]

const INV_LINE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',           key: 'line_number', width: '44px', align: 'center' },
  { header: 'Product',     key: 'product_id',  width: '180px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Description', key: 'description' },
  { header: 'Qty',         key: 'quantity',   width: '70px', align: 'right' },
  { header: 'UOM',         key: 'uom_id',     width: '90px',
    render: r => <LookupCell kind="uom" id={r.uom_id as number} /> },
  { header: 'Unit Price',  key: 'unit_price', width: '100px', align: 'right',
    render: r => Number(r.unit_price ?? 0).toFixed(2) },
  { header: 'Tax',         key: 'tax_amount', width: '80px', align: 'right',
    render: r => Number(r.tax_amount ?? 0).toFixed(2) },
  { header: 'Line Total',  key: 'line_total', width: '110px', align: 'right',
    render: r => Number(r.line_total ?? 0).toFixed(2) },
]

const INV_WORKFLOW: WorkflowAction[] = [
  { label: 'Post Invoice', action: 'post',   variant: 'primary', icon: 'post_add',     visibleStatuses: ['DRAFT'] },
  { label: 'Record Payment', action: 'pay',  variant: 'primary', icon: 'payments',     visibleStatuses: ['POSTED', 'PARTIAL'],
    prompt: { field: 'amount', label: 'Payment amount', type: 'number' } },
  { label: 'Cancel',       action: 'cancel', variant: 'danger',  icon: 'block',        visibleStatuses: ['DRAFT', 'POSTED'] },
]

export function InvoiceSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/purchase-invoices`)
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
      String(r.supplier_invoice_no ?? '').toLowerCase().includes(q)
    )
  }, [data, search])

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Input
          id="inv-search"
          placeholder="Search invoices..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" iconLeft="add" onClick={() => setModalDoc(null)} className="ml-auto">
          New Invoice
        </Button>
      </div>

      <Table
        columns={INV_COLS}
        data={filtered}
        loading={loading}
        empty="No purchase invoices found"
        onRowClick={row => setModalDoc(row)}
      />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen
          onClose={() => setModalDoc(undefined)}
          onRefresh={load}
          endpoint={`${BASE}/purchase-invoices`}
          doc={modalDoc}
          entityLabel="Purchase Invoice"
          docKind="PI"
          listSubFields={['invoice_date', 'due_date']}
          headerFields={INV_HEADER}
          lineFields={INV_LINE_FIELDS}
          lineColumns={INV_LINE_COLS}
          lineEndpointSuffix="lines"
          workflowActions={INV_WORKFLOW}
        />
      )}
    </>
  )
}
