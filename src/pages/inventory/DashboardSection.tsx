import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../../lib/api'
import { StatTile } from '../../components/dashboard/StatTile'
import { Table, type Column } from '../../components/ui/Table'
import { LookupCell } from '../../lib/lookups'

interface Balance {
  product_id:   number
  warehouse_id: number
  quantity:     number
  unit_cost?:   number
  total_value?: number
}

interface Product {
  id: number; code: string; name: string; min_stock_qty?: number; cost_price?: number
}

interface MR { id: number; status: string }
interface QC { id: number; status: string; qc_type: string }
interface GI { id: number; status: string }

const LOW_STOCK_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Product',    key: 'product_id',  width: '260px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Warehouse',  key: 'warehouse_id', width: '180px',
    render: r => <LookupCell kind="warehouse" id={r.warehouse_id as number} /> },
  { header: 'On Hand',    key: 'quantity', align: 'right', width: '110px',
    render: r => Number(r.quantity ?? 0).toLocaleString() },
  { header: 'Min',        key: 'min_stock_qty', align: 'right', width: '100px',
    render: r => Number(r.min_stock_qty ?? 0).toLocaleString() },
]

export function DashboardSection() {
  const [balances, setBalances] = useState<Balance[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [mrs, setMRs] = useState<MR[]>([])
  const [qcs, setQCs] = useState<QC[]>([])
  const [gis, setGIs] = useState<GI[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      apiGet<Balance[]>('/api/v1/inventory/stock').catch(() => [] as Balance[]),
      apiGet<Product[]>('/api/v1/masterdata/products/').catch(() => [] as Product[]),
      apiGet<MR[]>('/api/v1/inventory/material-requests').catch(() => [] as MR[]),
      apiGet<QC[]>('/api/v1/inventory/quality-checks').catch(() => [] as QC[]),
      apiGet<GI[]>('/api/v1/inventory/issues').catch(() => [] as GI[]),
    ]).then(([b, p, m, q, g]) => {
      if (cancelled) return
      setBalances(Array.isArray(b) ? b : [])
      setProducts(Array.isArray(p) ? p : [])
      setMRs(Array.isArray(m) ? m : [])
      setQCs(Array.isArray(q) ? q : [])
      setGIs(Array.isArray(g) ? g : [])
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const { stats, lowStockRows } = useMemo(() => {
    // Total inventory valuation (Σ qty × unit_cost, falling back to product cost_price)
    const productById = new Map(products.map(p => [p.id, p]))
    let valuation = 0
    for (const b of balances) {
      const unit = Number(b.unit_cost ?? productById.get(b.product_id)?.cost_price ?? 0)
      valuation += Number(b.quantity ?? 0) * unit
    }
    // On-hand roll-up per product
    const onHand = new Map<number, number>()
    for (const b of balances) {
      onHand.set(b.product_id, (onHand.get(b.product_id) ?? 0) + Number(b.quantity ?? 0))
    }
    // Low stock — products whose total on-hand < min_stock_qty (>0)
    const lows: Balance[] = []
    for (const p of products) {
      const min = Number(p.min_stock_qty ?? 0)
      if (min <= 0) continue
      const oh = onHand.get(p.id) ?? 0
      if (oh < min) {
        // find the balance rows for this product so the table can show warehouse
        const rows = balances.filter(b => b.product_id === p.id)
        if (rows.length === 0) {
          lows.push({ product_id: p.id, warehouse_id: 0, quantity: 0 })
        } else {
          for (const b of rows) lows.push({ ...b })
        }
      }
    }

    const pendingMR = mrs.filter(m => m.status !== 'CANCELLED' && m.status !== 'COMPLETED').length
    const pendingQC = qcs.filter(q => q.status === 'PENDING' || q.status === 'IN_PROGRESS').length
    const draftGI   = gis.filter(g => g.status === 'DRAFT').length
    const skuCount  = products.length

    // enrich low stock rows with min qty for the table
    const rows = lows.map(l => ({ ...l, min_stock_qty: productById.get(l.product_id)?.min_stock_qty ?? 0 }))

    return {
      stats: { valuation, skuCount, pendingMR, pendingQC, draftGI, lowStockCount: lows.length, balanceLines: balances.length },
      lowStockRows: rows.slice(0, 10),
    }
  }, [balances, products, mrs, qcs, gis])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Products (SKUs)"     value={stats.skuCount}       sub={`${stats.balanceLines} balance rows`}    accent="primary" icon="inventory_2" loading={loading} />
        <StatTile label="Total Valuation"     value={stats.valuation.toLocaleString(undefined, { minimumFractionDigits: 2 })} sub="Σ qty × cost" accent="success" icon="payments" loading={loading} />
        <StatTile label="Low Stock"           value={stats.lowStockCount}  sub="Below min_stock_qty"                     accent="warning" icon="warning_amber" loading={loading} />
        <StatTile label="Pending Material Requests" value={stats.pendingMR} sub="Not completed"                          accent="info"    icon="assignment" loading={loading} />

        <StatTile label="QC Pending"          value={stats.pendingQC}      sub="Awaiting inspection"                     accent="warning" icon="verified" loading={loading} />
        <StatTile label="Draft Issues"        value={stats.draftGI}        sub="Not yet posted"                          accent="neutral" icon="output" loading={loading} />
      </div>

      <div>
        <div className="text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant mb-2">
          Low Stock — top {lowStockRows.length}
        </div>
        <Table columns={LOW_STOCK_COLS} data={lowStockRows as unknown as Record<string, unknown>[]} empty="All products above minimum stock levels" loading={loading} />
      </div>
    </div>
  )
}
