import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../../lib/api'
import { StatTile } from '../../components/dashboard/StatTile'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { LookupCell } from '../../lib/lookups'

// Manufacturing landing dashboard.
//
// Aggregates the raw lists on the client (avoids a bespoke BE endpoint that
// would only serve this one screen). Everything the tiles need is a plain
// GET the module already exposes.
interface Order {
  id:           number
  code:         string
  status:       string
  planned_qty:  number
  produced_qty: number
  product_id:   number
  uom_id:       number
  start_date:   string
}

interface QC {
  id:        number
  code:      string
  qc_type:   string
  status:    string
  lines:     Array<{ qty_passed: number; qty_failed: number }>
}

interface Issue {
  status: string
  reference_type: string
  lines: Array<{ quantity: number }>
}

interface GRN {
  status: string
  grn_type: string
  lines: Array<{ quantity: number }>
}

const RECENT_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',    key: 'code',        width: '130px' },
  { header: 'Product', key: 'product_id',  width: '200px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Status',  key: 'status',      width: '140px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Planned', key: 'planned_qty', width: '100px', align: 'right',
    render: r => Number(r.planned_qty ?? 0).toLocaleString() },
  { header: 'Produced',key: 'produced_qty',width: '100px', align: 'right',
    render: r => Number(r.produced_qty ?? 0).toLocaleString() },
  { header: 'UOM',     key: 'uom_id',      width: '90px',
    render: r => <LookupCell kind="uom" id={r.uom_id as number} /> },
]

export function DashboardSection() {
  const [orders, setOrders] = useState<Order[]>([])
  const [qcs,    setQCs]    = useState<QC[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [grns,   setGRNs]   = useState<GRN[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      apiGet<Order[]>('/api/v1/manufacturing/orders').catch(() => [] as Order[]),
      apiGet<QC[]>('/api/v1/inventory/quality-checks').catch(() => [] as QC[]),
      apiGet<Issue[]>('/api/v1/inventory/issues').catch(() => [] as Issue[]),
      apiGet<GRN[]>('/api/v1/procurement/goods-receipts').catch(() => [] as GRN[]),
    ]).then(([o, q, i, g]) => {
      if (cancelled) return
      setOrders(Array.isArray(o) ? o : [])
      setQCs(Array.isArray(q) ? q : [])
      setIssues(Array.isArray(i) ? i : [])
      setGRNs(Array.isArray(g) ? g : [])
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => {
    // Order-level totals
    let planned = 0, produced = 0
    let draft = 0, inProgress = 0, done = 0, cancelled = 0
    for (const o of orders) {
      planned  += Number(o.planned_qty ?? 0)
      produced += Number(o.produced_qty ?? 0)
      switch (o.status) {
        case 'DRAFT':       draft++;      break
        case 'IN_PROGRESS': inProgress++; break
        case 'COMPLETED':   done++;       break
        case 'CANCELLED':   cancelled++;  break
      }
    }
    // QC-failed (Product QC on production output)
    let qcFailed = 0
    for (const qc of qcs) {
      if (qc.qc_type !== 'PRODUCT_QC') continue
      for (const l of qc.lines ?? []) qcFailed += Number(l.qty_failed ?? 0)
    }
    // Issued to production floor (GIs referencing PRODUCTION_ORDER)
    let issued = 0
    for (const gi of issues) {
      if (gi.reference_type !== 'PRODUCTION_ORDER' || gi.status !== 'CONFIRMED') continue
      for (const l of gi.lines ?? []) issued += Number(l.quantity ?? 0)
    }
    // Refining loss ≈ (issued − bottled from PRODUCTION_OUTPUT GRNs)
    let bottled = 0
    for (const grn of grns) {
      if (grn.grn_type !== 'PRODUCTION_OUTPUT' || grn.status !== 'CONFIRMED') continue
      for (const l of grn.lines ?? []) bottled += Number(l.quantity ?? 0)
    }
    const wasted = Math.max(0, issued - bottled)
    return { planned, produced, draft, inProgress, done, cancelled, qcFailed, issued, wasted }
  }, [orders, qcs, issues, grns])

  const recent = useMemo(() =>
    [...orders].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 8),
    [orders]
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total Orders"    value={orders.length}      sub={`${stats.done} completed`}  accent="primary" icon="factory"                loading={loading} />
        <StatTile label="In Progress"     value={stats.inProgress}   sub={`${stats.draft} draft`}     accent="info"    icon="precision_manufacturing" loading={loading} />
        <StatTile label="Planned"         value={stats.planned.toLocaleString()} sub="Total planned qty" accent="neutral" icon="event_note"           loading={loading} />
        <StatTile label="Produced"        value={stats.produced.toLocaleString()} sub={`${stats.planned ? ((stats.produced / stats.planned) * 100).toFixed(1) : 0}% of plan`} accent="success" icon="check_circle" loading={loading} />
        <StatTile label="Issued (to floor)" value={stats.issued.toLocaleString()} sub="From MR/GI" accent="info" icon="output" loading={loading} />
        <StatTile label="Bottled (out)"   value={(stats.issued - stats.wasted).toLocaleString()} sub="From PRODUCTION_OUTPUT GRNs" accent="primary" icon="local_shipping" loading={loading} />
        <StatTile label="QC Failed"       value={stats.qcFailed.toLocaleString()} sub="Product-QC rejects" accent="warning" icon="report" loading={loading} />
        <StatTile label="Refining Loss"   value={stats.wasted.toLocaleString()}   sub={`${stats.issued ? ((stats.wasted / stats.issued) * 100).toFixed(1) : 0}% of issued`} accent="error" icon="delete_sweep" loading={loading} />
      </div>

      <div>
        <div className="text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant mb-2">
          Recent Manufacturing Orders
        </div>
        <Table columns={RECENT_COLS} data={recent as unknown as Record<string, unknown>[]} empty="No production orders yet" loading={loading} />
      </div>
    </div>
  )
}
