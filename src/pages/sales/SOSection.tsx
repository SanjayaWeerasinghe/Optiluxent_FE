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
  salesQuotationOptions,
} from '../master-data/useOptions'

const BASE = '/api/v1/sales'

const SO_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',       key: 'code',                   width: '130px' },
  { header: 'Type',       key: 'document_type_id', width: '200px',
    render: r => <LookupCell kind="documentType" id={r.document_type_id as number} /> },
  { header: 'Customer',  key: 'customer_id',  width: '200px',
    render: r => <LookupCell kind="customer" id={r.customer_id as number} /> },
  { header: 'Warehouse', key: 'warehouse_id', width: '160px',
    render: r => <LookupCell kind="warehouse" id={r.warehouse_id as number} /> },
  { header: 'Order Date', key: 'order_date',             width: '110px' },
  { header: 'Expected',   key: 'expected_delivery_date', width: '110px' },
  { header: 'Total',      key: 'total_amount',           width: '110px', align: 'right',
    render: r => formatMoney(r.total_amount as number) },
  { header: 'Status', key: 'status', width: '120px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
]

const SO_HEADER: FieldDef[] = [
  { key: 'code',                   label: 'Code',              type: 'text',     required: true, placeholder: 'SO-001' },
  { key: 'document_type_id',       label: 'Type',              type: 'select',   loadOptions: documentTypeOptions('SO') },
  { key: 'sq_id',                  label: 'Source Quotation',  type: 'select',   loadOptions: salesQuotationOptions() },
  { key: 'customer_id',            label: 'Customer',          type: 'select',   required: true, loadOptions: customerOptions() },
  { key: 'order_date',             label: 'Order Date',        type: 'date',     required: true },
  { key: 'expected_delivery_date', label: 'Expected Delivery', type: 'date' },
  { key: 'currency_id',            label: 'Currency',          type: 'select',   required: true, loadOptions: currencyOptions() },
  { key: 'exchange_rate',          label: 'Exchange Rate',     type: 'number',   min: 0, step: 0.000001 },
  { key: 'payment_term_id',        label: 'Payment Term',      type: 'select',   loadOptions: paymentTermOptions() },
  { key: 'warehouse_id',           label: 'Warehouse',         type: 'select',   required: true, loadOptions: warehouseOptions() },
  { key: 'notes',                  label: 'Notes',             type: 'textarea', rows: 2, span: true },
]

const SO_LINE_FIELDS: FieldDef[] = [
  { key: 'product_id',   label: 'Product',     type: 'select', required: true, loadOptions: productOptions() },
  { key: 'description',  label: 'Description', type: 'text' },
  { key: 'quantity',     label: 'Quantity',    type: 'number', required: true, min: 0, step: 0.001 },
  { key: 'uom_id',       label: 'UOM',         type: 'select', required: true, loadOptions: uomOptions() },
  { key: 'unit_price',   label: 'Unit Price',  type: 'number', min: 0, step: 0.01 },
  { key: 'discount_pct', label: 'Discount %',  type: 'number', min: 0, step: 0.01 },
  { key: 'tax_code_id',  label: 'Tax Code',    type: 'select', loadOptions: taxCodeOptions() },
  { key: 'notes',        label: 'Notes',       type: 'text',   span: true },
]

const SO_LINE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',            key: 'line_number',   width: '44px',  align: 'center' },
  { header: 'Product',      key: 'product_id',    width: '180px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Description',  key: 'description' },
  { header: 'Qty',          key: 'quantity',      width: '70px',  align: 'right' },
  { header: 'UOM',          key: 'uom_id',        width: '90px',
    render: r => <LookupCell kind="uom" id={r.uom_id as number} /> },
  { header: 'Delivered',    key: 'delivered_qty', width: '80px',  align: 'right' },
  { header: 'Unit Price',   key: 'unit_price',    width: '100px', align: 'right',
    render: r => Number(r.unit_price ?? 0).toFixed(2) },
  { header: 'Line Total',   key: 'line_total',    width: '110px', align: 'right',
    render: r => Number(r.line_total ?? 0).toFixed(2) },
]

const SO_WORKFLOW: WorkflowAction[] = [
  { label: 'Confirm Order', action: 'confirm', variant: 'primary', icon: 'check_circle', visibleStatuses: ['DRAFT'] },
  { label: 'Cancel',        action: 'cancel',  variant: 'danger',  icon: 'block',        visibleStatuses: ['DRAFT', 'CONFIRMED'] },
]

export function SOSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/sales-orders`)
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
          id="so-search"
          placeholder="Search sales orders..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" iconLeft="add" onClick={() => setModalDoc(null)} className="ml-auto">
          New SO
        </Button>
      </div>

      <Table
        columns={SO_COLS}
        data={filtered}
        loading={loading}
        empty="No sales orders found"
        onRowClick={row => setModalDoc(row)}
      />

      {modalDoc !== undefined && (
        <DocDetailModal
          isOpen
          onClose={() => setModalDoc(undefined)}
          onRefresh={load}
          endpoint={`${BASE}/sales-orders`}
          doc={modalDoc}
          entityLabel="Sales Order"
          docKind="SO"
          listSubFields={['order_date', 'expected_delivery_date']}
          headerFields={SO_HEADER}
          lineFields={SO_LINE_FIELDS}
          lineColumns={SO_LINE_COLS}
          workflowActions={SO_WORKFLOW}
          editableStatuses={['DRAFT']}
          prefillLinesFrom={{
            field: 'sq_id',
            fetch: async sqID => {
              const sq = await apiGet<{ lines?: Array<Record<string, unknown>> }>(`${BASE}/quotations/${sqID}`)
              const src = sq?.lines ?? []
              return src.map(l => ({
                product_id:   l.product_id,
                variant_id:   l.variant_id,
                description:  l.description,
                quantity:     l.quantity,
                uom_id:       l.uom_id,
                unit_price:   l.unit_price ?? 0,
                discount_pct: l.discount_pct ?? 0,
                tax_code_id:  l.tax_code_id,
                notes:        l.notes,
              }))
            },
          }}
        />
      )}
    </>
  )
}
