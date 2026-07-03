import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../../lib/api'
import { StatTile } from '../../components/dashboard/StatTile'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { LookupCell } from '../../lib/lookups'

interface SQ {
  id: number; code: string; status: string; total_amount?: number; converted_so_id?: number
}
interface SO {
  id: number; code: string; status: string; customer_id: number; order_date?: string; total_amount?: number
}
interface DO {
  id: number; code: string; status: string; delivery_date?: string
}
interface SI {
  id: number; code: string; status: string; invoice_date?: string; total_amount?: number
}

const RECENT_SO: Column<Record<string, unknown>>[] = [
  { header: 'Code',      key: 'code',        width: '130px' },
  { header: 'Customer',  key: 'customer_id', width: '200px',
    render: r => <LookupCell kind="customer" id={r.customer_id as number} /> },
  { header: 'Status',    key: 'status',      width: '140px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
  { header: 'Total',     key: 'total_amount',width: '120px', align: 'right',
    render: r => Number(r.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) },
  { header: 'Date',      key: 'order_date',  width: '110px' },
]

export function DashboardSection() {
  const [sqs, setSQs] = useState<SQ[]>([])
  const [sos, setSOs] = useState<SO[]>([])
  const [dos, setDOs] = useState<DO[]>([])
  const [sis, setSIs] = useState<SI[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      apiGet<SQ[]>('/api/v1/sales/quotations').catch(() => [] as SQ[]),
      apiGet<SO[]>('/api/v1/sales/sales-orders').catch(() => [] as SO[]),
      apiGet<DO[]>('/api/v1/sales/deliveries').catch(() => [] as DO[]),
      apiGet<SI[]>('/api/v1/sales/invoices').catch(() => [] as SI[]),
    ]).then(([q, o, d, i]) => {
      if (cancelled) return
      setSQs(Array.isArray(q) ? q : [])
      setSOs(Array.isArray(o) ? o : [])
      setDOs(Array.isArray(d) ? d : [])
      setSIs(Array.isArray(i) ? i : [])
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => {
    // SO breakdown
    let soDraft = 0, soConfirmed = 0, soDelivered = 0, soInvoiced = 0
    for (const o of sos) {
      switch (o.status) {
        case 'DRAFT':     soDraft++;     break
        case 'CONFIRMED': soConfirmed++; break
        case 'DELIVERED': soDelivered++; break
        case 'INVOICED':  soInvoiced++;  break
      }
    }
    // SQ pending (not yet converted)
    const sqPending = sqs.filter(q => q.status !== 'CONVERTED' && q.status !== 'CANCELLED' && q.status !== 'EXPIRED').length
    // Revenue = sum of confirmed / paid invoice totals (skip DRAFT/VOID)
    let revenue = 0
    for (const inv of sis) {
      if (inv.status === 'DRAFT' || inv.status === 'VOID' || inv.status === 'CANCELLED') continue
      revenue += Number(inv.total_amount ?? 0)
    }
    // Deliveries in-flight (DRAFT/CONFIRMED, not yet DELIVERED)
    const doInflight = dos.filter(d => d.status === 'DRAFT' || d.status === 'CONFIRMED').length
    return { soDraft, soConfirmed, soDelivered, soInvoiced, sqPending, revenue, doInflight }
  }, [sqs, sos, dos, sis])

  const recent = useMemo(() =>
    [...sos].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 8),
    [sos]
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Sales Orders"     value={sos.length}         sub={`${stats.soConfirmed} confirmed · ${stats.soDraft} draft`} accent="primary" icon="shopping_bag" loading={loading} />
        <StatTile label="Quotations Open"  value={stats.sqPending}    sub={`${sqs.length} total`}                                    accent="info"    icon="request_quote" loading={loading} />
        <StatTile label="Deliveries"       value={dos.length}         sub={`${stats.doInflight} in flight`}                          accent="info"    icon="local_shipping" loading={loading} />
        <StatTile label="Invoices"         value={sis.length}         sub={`${stats.soInvoiced} SO invoiced`}                        accent="neutral" icon="receipt" loading={loading} />

        <StatTile label="Revenue (confirmed)" value={stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} sub="Sum of non-void SI totals" accent="success" icon="payments" loading={loading} />
        <StatTile label="SO → Delivered"   value={stats.soDelivered}  sub="Ready for invoicing"                                      accent="success" icon="task_alt" loading={loading} />
        <StatTile label="Awaiting Delivery" value={stats.soConfirmed} sub="Confirmed SOs to ship"                                    accent="warning" icon="pending_actions" loading={loading} />
        <StatTile label="Quotations Won"   value={sqs.filter(q => q.status === 'CONVERTED').length} sub="Converted to SO"           accent="primary" icon="check_circle" loading={loading} />
      </div>

      <div>
        <div className="text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant mb-2">
          Recent Sales Orders
        </div>
        <Table columns={RECENT_SO} data={recent as unknown as Record<string, unknown>[]} empty="No sales orders yet" loading={loading} />
      </div>
    </div>
  )
}
