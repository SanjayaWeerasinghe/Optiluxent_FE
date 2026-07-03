import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, type Column } from '../../components/ui/Table'
import { apiGet } from '../../lib/api'

interface DashResponse {
  order: {
    id:          number
    code:        string
    status:      string
    product_id:  number
    uom_id:      number
    planned_qty: number
    produced_qty:number
  }
  material_requests: Array<{
    id: number; code: string; status: string
    lines: Array<{ product_id: number; uom_id: number; requested_qty: number; issued_qty: number }>
  }>
  issues: Array<{ id: number; code: string; status: string; lines: Array<{ product_id: number; uom_id: number; quantity: number }> }>
  transfers: Array<{ id: number; code: string; status: string; lines: Array<{ product_id: number; uom_id: number; quantity: number }> }>
  grns: Array<{ id: number; code: string; status: string; grn_type: string; lines: Array<{ product_id: number; uom_id: number; quantity: number }> }>
  qcs: Array<{ id: number; code: string; qc_type: string; status: string; qty_checked: number; qty_passed: number; qty_failed: number; reference_type: string; reference_id: number }>
  totals: {
    planned_litres:           number
    requested_litres:         number
    issued_litres:            number
    produced_litres:          number
    produced_ok_litres:       number
    produced_qc_failed_litres: number
    wastage_upstream_litres:  number
    wastage_upstream_pct:     number
    produced_ok_pct:          number
  }
}

function fmt(n: number) {
  return Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// Stat tile — coloured accent + big number + optional sub-line.
function Tile(props: { label: string; value: string; sub?: string; accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' }) {
  const accent = props.accent ?? 'neutral'
  const bg = {
    primary: 'bg-primary/5 border-primary/20 text-primary',
    success: 'bg-success/10 border-success/20 text-success',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    error:   'bg-error/10 border-error/20 text-error',
    info:    'bg-info/10 border-info/20 text-info',
    neutral: 'bg-surface-container-low border-outline-variant text-on-surface',
  }[accent]
  return (
    <div className={`p-3 rounded-lg border ${bg}`}>
      <div className="text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant">{props.label}</div>
      <div className="text-title-md font-title-md mt-1">{props.value}</div>
      {props.sub && <div className="text-body-sm text-on-surface-variant mt-0.5">{props.sub}</div>}
    </div>
  )
}

const MR_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',   key: 'code',   width: '130px' },
  { header: 'Status', key: 'status', width: '120px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Requested (all lines)', key: '_req', align: 'right',
    render: (r: Record<string, unknown>) => {
      const lines = (r.lines as Array<{ requested_qty: number }>) ?? []
      return fmt(lines.reduce((s, l) => s + Number(l.requested_qty ?? 0), 0))
    } },
  { header: 'Issued (all lines)', key: '_iss', align: 'right',
    render: (r: Record<string, unknown>) => {
      const lines = (r.lines as Array<{ issued_qty: number }>) ?? []
      return fmt(lines.reduce((s, l) => s + Number(l.issued_qty ?? 0), 0))
    } },
]

const GI_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',   key: 'code',   width: '130px' },
  { header: 'Status', key: 'status', width: '120px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Total qty', key: '_qty', align: 'right',
    render: (r: Record<string, unknown>) => {
      const lines = (r.lines as Array<{ quantity: number }>) ?? []
      return fmt(lines.reduce((s, l) => s + Number(l.quantity ?? 0), 0))
    } },
]

const GRN_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',   key: 'code',   width: '130px' },
  { header: 'Type',   key: 'grn_type', width: '150px' },
  { header: 'Status', key: 'status', width: '120px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Bottled qty', key: '_qty', align: 'right',
    render: (r: Record<string, unknown>) => {
      const lines = (r.lines as Array<{ quantity: number }>) ?? []
      return fmt(lines.reduce((s, l) => s + Number(l.quantity ?? 0), 0))
    } },
]

interface Props {
  orderID: number
}

// The Manufacturing Order dashboard. Fetches /orders/:id/dashboard and renders
// 5 metric tiles plus tabs with the linked documents (MRs, GIs, GRNs).
export function MODashboard({ orderID }: Props) {
  const [data,    setData]    = useState<DashResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<'overview' | 'mrs' | 'issues' | 'grns'>('overview')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiGet<DashResponse>(`/api/v1/manufacturing/orders/${orderID}/dashboard`)
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orderID])

  if (loading) {
    return <div className="py-10 text-center text-on-surface-variant text-body-sm">Loading dashboard…</div>
  }
  if (!data) {
    return <div className="py-10 text-center text-error text-body-sm">Could not load dashboard.</div>
  }

  const t = data.totals

  return (
    <div className="space-y-5">
      {/* Metric tiles */}
      <div className="grid grid-cols-5 gap-3">
        <Tile label="Planned"       value={`${fmt(t.planned_litres)} L`}                                accent="primary" />
        <Tile label="Issued"        value={`${fmt(t.issued_litres)} L`}   sub={`${fmt(t.issued_litres / (t.planned_litres || 1) * 100)}% of plan`} accent="info" />
        <Tile label="Produced"      value={`${fmt(t.produced_litres)} L`} sub={`${fmt(t.produced_ok_litres)} L QC passed`}                            accent="success" />
        <Tile label="QC Failed"     value={`${fmt(t.produced_qc_failed_litres)} L`} sub={`${fmt((t.produced_qc_failed_litres / (t.produced_litres || 1)) * 100)}% of bottled`} accent="warning" />
        <Tile label="Refining Loss" value={`${fmt(t.wastage_upstream_litres)} L`} sub={`${fmt(t.wastage_upstream_pct)}%`}                              accent="error" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant">
        {(['overview', 'mrs', 'issues', 'grns'] as const).map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={[
              'px-3 py-2 -mb-px border-b-2 text-body-sm capitalize transition-colors',
              tab === k ? 'border-primary text-primary font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface',
            ].join(' ')}
          >
            {k === 'mrs'    ? `Material Requests (${data.material_requests.length})` :
             k === 'issues' ? `Issues / Transfers (${data.issues.length + data.transfers.length})` :
             k === 'grns'   ? `Outputs (${data.grns.length})` :
             'Overview'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="p-4 rounded border border-outline-variant bg-surface-container-lowest">
          <div className="text-body-sm text-on-surface">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-label-mono font-label-mono uppercase text-on-surface-variant mb-1">Progress</div>
                <div className="w-full h-2 rounded-full bg-outline-variant overflow-hidden">
                  <div className="h-full bg-success" style={{ width: `${Math.min(100, (t.produced_ok_litres / (t.planned_litres || 1)) * 100)}%` }} />
                </div>
                <div className="text-body-sm mt-1">{fmt(t.produced_ok_litres)} / {fmt(t.planned_litres)} L QC-passed</div>
              </div>
              <div>
                <div className="text-label-mono font-label-mono uppercase text-on-surface-variant mb-1">Wastage breakdown</div>
                <div className="text-body-sm">Refining loss: {fmt(t.wastage_upstream_litres)} L</div>
                <div className="text-body-sm">QC-failed: {fmt(t.produced_qc_failed_litres)} L</div>
                <div className="text-body-sm font-semibold mt-1">Usable output %: {fmt(t.produced_ok_pct)}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'mrs' && (
        <Table columns={MR_COLS} data={data.material_requests as unknown as Record<string, unknown>[]} empty="No material requests linked" />
      )}

      {tab === 'issues' && (
        <div className="space-y-4">
          <div>
            <div className="text-label-mono font-label-mono uppercase text-on-surface-variant mb-1">Goods Issues</div>
            <Table columns={GI_COLS} data={data.issues as unknown as Record<string, unknown>[]} empty="No goods issues" />
          </div>
          <div>
            <div className="text-label-mono font-label-mono uppercase text-on-surface-variant mb-1">Goods Transfers</div>
            <Table columns={GI_COLS} data={data.transfers as unknown as Record<string, unknown>[]} empty="No transfers" />
          </div>
        </div>
      )}

      {tab === 'grns' && (
        <Table columns={GRN_COLS} data={data.grns as unknown as Record<string, unknown>[]} empty="No production output GRNs yet" />
      )}
    </div>
  )
}
