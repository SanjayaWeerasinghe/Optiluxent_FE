import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../../lib/api'
import { StatTile } from '../../components/dashboard/StatTile'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { LookupCell } from '../../lib/lookups'

interface PR { id: number; status: string }
interface PO { id: number; code: string; status: string; supplier_id: number; total_amount?: number; order_date?: string }
interface GRN { id: number; code: string; status: string; grn_type: string; receipt_date?: string; lines: Array<{ quantity: number; unit_cost?: number }> }
interface Inv { id: number; status: string; total_amount?: number }

const RECENT_PO: Column<Record<string, unknown>>[] = [
  { header: 'Code',     key: 'code',         width: '130px' },
  { header: 'Supplier', key: 'supplier_id',  width: '220px',
    render: r => <LookupCell kind="supplier" id={r.supplier_id as number} /> },
  { header: 'Status',   key: 'status',       width: '140px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Total',    key: 'total_amount', width: '120px', align: 'right',
    render: r => Number(r.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
  { header: 'Order Date', key: 'order_date', width: '110px' },
]

export function DashboardSection() {
  const [prs,   setPRs]   = useState<PR[]>([])
  const [pos,   setPOs]   = useState<PO[]>([])
  const [grns,  setGRNs]  = useState<GRN[]>([])
  const [invs,  setInvs]  = useState<Inv[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      apiGet<PR[]>('/api/v1/procurement/purchase-requests').catch(() => [] as PR[]),
      apiGet<PO[]>('/api/v1/procurement/purchase-orders').catch(() => [] as PO[]),
      apiGet<GRN[]>('/api/v1/procurement/goods-receipts').catch(() => [] as GRN[]),
      apiGet<Inv[]>('/api/v1/procurement/purchase-invoices').catch(() => [] as Inv[]),
    ]).then(([r, o, g, i]) => {
      if (cancelled) return
      setPRs(Array.isArray(r) ? r : [])
      setPOs(Array.isArray(o) ? o : [])
      setGRNs(Array.isArray(g) ? g : [])
      setInvs(Array.isArray(i) ? i : [])
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => {
    const prPending  = prs.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT').length
    const prApproved = prs.filter(p => p.status === 'APPROVED').length

    // POs "still to come" — confirmed, not yet fully received. We approximate
    // "not received" via GRN linkage instead of a dedicated field.
    let poOpen = 0, poCommitted = 0
    for (const po of pos) {
      if (po.status === 'CONFIRMED' || po.status === 'PARTIAL') poOpen++
      if (po.status !== 'DRAFT' && po.status !== 'CANCELLED') {
        poCommitted += Number(po.total_amount ?? 0)
      }
    }

    // GRNs received (all confirmed WITH_PO / WITHOUT_PO — excludes returns / production output).
    let grnReceivedCount = 0
    let grnValue = 0
    for (const g of grns) {
      if (g.status !== 'CONFIRMED') continue
      if (g.grn_type === 'CUSTOMER_RETURN' || g.grn_type === 'PRODUCTION_OUTPUT' || g.grn_type === 'PRODUCTION_RETURN') continue
      grnReceivedCount++
      for (const l of g.lines ?? []) {
        grnValue += Number(l.quantity ?? 0) * Number(l.unit_cost ?? 0)
      }
    }

    // Invoiced spend
    let invoicedSpend = 0
    for (const inv of invs) {
      if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') continue
      invoicedSpend += Number(inv.total_amount ?? 0)
    }

    return {
      prPending, prApproved,
      poOpen, poCommitted,
      grnReceivedCount, grnValue,
      invoicedSpend,
    }
  }, [prs, pos, grns, invs])

  const recent = useMemo(() =>
    [...pos].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 8),
    [pos]
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Requests"          value={prs.length}    sub={`${stats.prPending} pending · ${stats.prApproved} approved`} accent="info"    icon="receipt_long" loading={loading} />
        <StatTile label="Purchase Orders"   value={pos.length}    sub={`${stats.poOpen} open`}                                       accent="primary" icon="shopping_cart" loading={loading} />
        <StatTile label="Committed Spend"   value={stats.poCommitted.toLocaleString(undefined, { minimumFractionDigits: 2 })} sub="Σ non-draft PO totals" accent="warning" icon="request_quote" loading={loading} />
        <StatTile label="GRNs Received"     value={stats.grnReceivedCount} sub={`${stats.grnValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} value`} accent="success" icon="move_to_inbox" loading={loading} />

        <StatTile label="POs Awaiting Delivery" value={stats.poOpen}   sub="Confirmed / partial"                accent="warning" icon="pending"          loading={loading} />
        <StatTile label="Invoices"          value={invs.length}        sub="Purchase invoices captured"          accent="neutral" icon="receipt"          loading={loading} />
        <StatTile label="Invoiced Spend"    value={stats.invoicedSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })} sub="Excludes drafts" accent="success" icon="payments" loading={loading} />
        <StatTile label="Suppliers (PO)"    value={new Set(pos.map(p => p.supplier_id)).size} sub="Unique suppliers used" accent="info" icon="handshake" loading={loading} />
      </div>

      <div>
        <div className="text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant mb-2">
          Recent Purchase Orders
        </div>
        <Table columns={RECENT_PO} data={recent as unknown as Record<string, unknown>[]} empty="No purchase orders yet" loading={loading} />
      </div>
    </div>
  )
}
