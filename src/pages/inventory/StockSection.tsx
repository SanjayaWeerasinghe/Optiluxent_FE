import { useState, useEffect } from 'react'
import { Button, Select } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { Tabs, type TabItem } from '../../components/ui/Tabs'
import { apiGet } from '../../lib/api'
import { LookupCell } from '../../lib/lookups'
import { type SelectOption } from '../master-data/CrudSection'

const BASE_STOCK = '/api/v1/inventory/stock'
const BASE_LEDGER = '/api/v1/masterdata/inventory/stock/ledger'
const BASE_WH = '/api/v1/masterdata/inventory/warehouses'
const BASE_PROD = '/api/v1/masterdata/products/'

const TABS: TabItem[] = [
  { id: 'balance', label: 'Stock Balance', icon: 'inventory_2' },
  { id: 'ledger',  label: 'Stock Ledger',  icon: 'history' },
]

// ── Balance ───────────────────────────────────────────────────────────────────
const BAL_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Product',     key: 'product_id',   width: '180px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Warehouse',   key: 'warehouse_id', width: '160px',
    render: r => <LookupCell kind="warehouse" id={r.warehouse_id as number} /> },
  { header: 'Location ID', key: 'location_id',  width: '100px' },
  { header: 'Quantity', key: 'quantity', width: '100px', align: 'right',
    render: r => Number(r.quantity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 }) },
  { header: 'Total Cost', key: 'total_cost', width: '110px', align: 'right',
    render: r => Number(r.total_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
]

// ── Ledger ────────────────────────────────────────────────────────────────────
const LEDGER_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Date',       key: 'transaction_date', width: '120px' },
  { header: 'Type',       key: 'transaction_type', width: '130px' },
  { header: 'Ref. Type',  key: 'reference_type',   width: '110px' },
  { header: 'Product',    key: 'product_id',       width: '180px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Warehouse',  key: 'warehouse_id',     width: '160px',
    render: r => <LookupCell kind="warehouse" id={r.warehouse_id as number} /> },
  { header: 'Qty', key: 'quantity', width: '90px', align: 'right',
    render: r => {
      const q = Number(r.quantity ?? 0)
      return (
        <span className={q < 0 ? 'text-error' : 'text-success'}>
          {q > 0 ? '+' : ''}{q.toLocaleString(undefined, { maximumFractionDigits: 3 })}
        </span>
      )
    },
  },
  { header: 'Unit Cost', key: 'unit_cost', width: '100px', align: 'right',
    render: r => Number(r.unit_cost ?? 0).toFixed(2) },
  { header: 'Notes', key: 'notes' },
]

export function StockSection() {
  const [tab,          setTab]          = useState('balance')
  const [warehouseId,  setWarehouseId]  = useState('')
  const [productId,    setProductId]    = useState('')
  const [data,         setData]         = useState<Record<string, unknown>[]>([])
  const [loading,      setLoading]      = useState(false)
  const [warehouses,   setWarehouses]   = useState<SelectOption[]>([])
  const [products,     setProducts]     = useState<SelectOption[]>([])

  // Load filter options once
  useEffect(() => {
    apiGet<{ id: number; code: string; name: string }[]>(BASE_WH)
      .then(rows => setWarehouses(rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` }))))
      .catch(() => {})
    apiGet<{ id: number; code: string; name: string }[]>(BASE_PROD)
      .then(rows => setProducts(rows.map(r => ({ value: r.id, label: `${r.code} – ${r.name}` }))))
      .catch(() => {})
  }, [])

  function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (warehouseId) params.set('warehouse_id', warehouseId)
    if (productId)   params.set('product_id',   productId)

    const url = tab === 'balance'
      ? `${BASE_STOCK}?${params}`
      : `${BASE_LEDGER}?${params}&limit=200`

    apiGet<Record<string, unknown>[]>(url)
      .then(rows => setData(Array.isArray(rows) ? rows : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }

  // Reload when tab changes
  useEffect(() => { setData([]) }, [tab])

  const whOptions  = [{ value: '', label: 'All Warehouses' }, ...warehouses]
  const prodOptions = [{ value: '', label: 'All Products' }, ...products]

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} active={tab} onChange={t => setTab(t)} size="sm" />

      <div className="flex items-center gap-3 flex-wrap pt-2">
        <div className="w-56">
          <Select
            id="stock-wh"
            options={whOptions.map(o => ({ ...o, value: String(o.value) }))}
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value)}
            placeholder="All Warehouses"
          />
        </div>
        <div className="w-64">
          <Select
            id="stock-prod"
            options={prodOptions.map(o => ({ ...o, value: String(o.value) }))}
            value={productId}
            onChange={e => setProductId(e.target.value)}
            placeholder="All Products"
          />
        </div>
        <Button variant="primary" size="sm" icon="search" onClick={load} loading={loading}>
          Load
        </Button>
        {data.length > 0 && (
          <span className="text-label-mono font-label-mono text-on-surface-variant ml-2">
            {data.length} row{data.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {tab === 'balance' && (
        <Table
          columns={BAL_COLS}
          data={data}
          loading={loading}
          empty="Use the filters above and click Load to view stock balances"
          rowKey="product_id"
        />
      )}

      {tab === 'ledger' && (
        <Table
          columns={LEDGER_COLS}
          data={data}
          loading={loading}
          empty="Use the filters above and click Load to view ledger entries"
        />
      )}
    </div>
  )
}
