import { useState, useEffect, useCallback } from 'react'
import { Icon } from '../../components/ui/Icon'
import { Badge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { useLookupLabel, type LookupKind } from '../../lib/lookups'

// Small inline pretty-printer for a FK reference inside a line-op log entry.
function LineRef({ kind, id }: { kind: LookupKind; id: number | null | undefined }) {
  const fmt = useLookupLabel()
  if (!id) return <>—</>
  return <>{fmt(kind, id)}</>
}

interface AuditLog {
  id:          number
  action:      string
  resource:    string
  resource_id: string
  user_id?:    number
  new_values?: unknown
  old_values?: unknown
  ip_address?: string
  created_at:  string
}

interface Props {
  resource:   string
  resourceId: string
}

// ── Formatting helpers ───────────────────────────────────────────────────────

function formatTs(iso: string) {
  const d = new Date(iso)
  const now = Date.now()
  const diffMin = Math.round((now - d.getTime()) / 60000)
  if (diffMin < 1)          return 'just now'
  if (diffMin < 60)         return `${diffMin}m ago`
  if (diffMin < 60 * 24)    return `${Math.round(diffMin / 60)}h ago`
  if (diffMin < 60 * 24 * 7) return `${Math.round(diffMin / (60 * 24))}d ago`
  return d.toLocaleString(undefined, {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function actionVariant(action: string): 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary' {
  switch (action) {
    case 'CREATE':                                    return 'success'
    case 'DELETE': case 'LINE_DELETED': case 'CANCEL':
    case 'REJECT':                                    return 'error'
    case 'UPDATE': case 'LINE_UPDATED':               return 'info'
    case 'LINE_ADDED':                                return 'primary'
    case 'APPROVE': case 'CONFIRM': case 'RECEIVE':
    case 'COMPLETE': case 'FINALIZE': case 'POST':
    case 'PAY': case 'ACCEPT':                        return 'success'
    case 'SUBMIT': case 'START': case 'RELEASE':
    case 'SEND':                                      return 'warning'
    default:                                          return 'secondary'
  }
}

// One-line human summary for the whole action. `entityLabel` is the singular
// noun for the doc kind so we say "confirmed this Goods Receipt", not
// "confirmed this goods-receipts".
function summarize(action: string, userName: string, entityLabel: string): string {
  switch (action) {
    case 'CREATE':       return `${userName} initiated this ${entityLabel}.`
    case 'DELETE':       return `${userName} deleted this ${entityLabel}.`
    case 'CONFIRM':      return `${userName} confirmed this ${entityLabel}.`
    case 'SUBMIT':       return `${userName} submitted this ${entityLabel} for approval.`
    case 'APPROVE':      return `${userName} approved this ${entityLabel}.`
    case 'REJECT':       return `${userName} rejected this ${entityLabel}.`
    case 'CANCEL':       return `${userName} cancelled this ${entityLabel}.`
    case 'ACCEPT':       return `${userName} accepted this ${entityLabel}.`
    case 'START':        return `${userName} started this ${entityLabel}.`
    case 'COMPLETE':     return `${userName} completed this ${entityLabel}.`
    case 'FINALIZE':     return `${userName} finalized this ${entityLabel}.`
    case 'RELEASE':      return `${userName} released this ${entityLabel}.`
    case 'SEND':         return `${userName} sent this ${entityLabel}.`
    case 'RECEIVE':      return `${userName} received this ${entityLabel}.`
    case 'POST':         return `${userName} posted this ${entityLabel}.`
    case 'PAY':          return `${userName} recorded a payment.`
    case 'LINE_ADDED':   return `${userName} added a line item.`
    case 'LINE_UPDATED': return `${userName} updated a line item.`
    case 'LINE_DELETED': return `${userName} removed a line item.`
    case 'UPDATE':       return `${userName} updated this ${entityLabel}.`
    default:             return `${userName} performed ${action.toLowerCase().replace(/_/g, ' ')}.`
  }
}

// Nice human-readable label for the resource path segment, e.g.
// "purchase-orders" → "Purchase Order".
function humanizeResource(resource: string): string {
  const singular = resource.replace(/s$/, '')
  return singular.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Turn a change-set into a compact "field: old → new" list.
function describeDiff(newVals: unknown, oldVals: unknown): string[] {
  const out: string[] = []
  const nv = (newVals && typeof newVals === 'object') ? newVals as Record<string, unknown> : {}
  const ov = (oldVals && typeof oldVals === 'object') ? oldVals as Record<string, unknown> : {}
  const skip = new Set(['created_at', 'updated_at', 'deleted_at', 'id', 'tenant_id'])
  for (const k of Object.keys(nv)) {
    if (skip.has(k)) continue
    const nVal = nv[k]
    const oVal = ov[k]
    // Skip nested arrays/objects — too noisy for a summary line.
    if (nVal !== null && typeof nVal === 'object') continue
    if (String(oVal ?? '') === String(nVal ?? '')) continue
    const from = oVal === undefined || oVal === null || oVal === '' ? '—' : String(oVal)
    const to   = nVal === undefined || nVal === null || nVal === '' ? '—' : String(nVal)
    out.push(`${k}: ${from} → ${to}`)
  }
  return out.slice(0, 4)
}

// ── Component ────────────────────────────────────────────────────────────────

export function AuditLogPanel({ resource, resourceId }: Props) {
  const [logs,    setLogs]    = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const format = useLookupLabel()

  const load = useCallback(() => {
    if (!resource || !resourceId) return
    setLoading(true)
    apiGet<{ logs: AuditLog[]; total: number }>(
      `/api/v1/audit-logs?resource=${encodeURIComponent(resource)}&resource_id=${encodeURIComponent(resourceId)}&limit=100`
    )
      .then(res => setLogs(Array.isArray(res?.logs) ? res.logs : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [resource, resourceId])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant sticky top-0 bg-surface-container-low z-10">
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <Icon name="history" size={14} />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Activity</span>
        </div>
        <button
          onClick={load}
          className="p-1 rounded text-on-surface-variant hover:bg-surface-container-high transition-colors"
          title="Refresh"
        >
          <Icon name="refresh" size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-surface-container animate-pulse" />
            ))}
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-on-surface-variant gap-2">
            <Icon name="history" size={28} />
            <span className="text-[12px]">No activity yet</span>
          </div>
        )}

        {!loading && logs.map(log => {
          const userName = log.user_id ? format('user', log.user_id) : 'System'
          const entity   = humanizeResource(resource)
          const summary  = summarize(log.action, userName, entity)
          const diffs    = describeDiff(log.new_values, log.old_values)
          // LINE_ADDED payloads are the raw line body — show the interesting
          // fields inline (product, qty, notes) rather than the raw JSON.
          const isLineOp = log.action === 'LINE_ADDED' || log.action === 'LINE_UPDATED'
          const nv       = (log.new_values && typeof log.new_values === 'object')
            ? log.new_values as Record<string, unknown>
            : null
          return (
            <div
              key={log.id}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <Badge variant={actionVariant(log.action)}>{log.action.replace(/_/g, ' ')}</Badge>
                  <span className="text-[11px] text-on-surface font-semibold">{userName}</span>
                </div>
                <span className="text-[10px] text-on-surface-variant">{formatTs(log.created_at)}</span>
              </div>
              <div className="text-[12px] text-on-surface leading-relaxed">{summary}</div>
              {/* Detail body — different renderers per action shape */}
              {isLineOp && nv && (
                <ul className="mt-1 ml-3 list-disc text-[11px] text-on-surface-variant">
                  {'product_id'    in nv && <li>product: <LineRef kind="product" id={nv.product_id as number} /></li>}
                  {'quantity'      in nv && <li>qty: {String(nv.quantity)}</li>}
                  {'requested_qty' in nv && <li>requested qty: {String(nv.requested_qty)}</li>}
                  {'unit_cost'     in nv && <li>unit cost: {String(nv.unit_cost)}</li>}
                  {'unit_price'    in nv && <li>unit price: {String(nv.unit_price)}</li>}
                </ul>
              )}
              {!isLineOp && diffs.length > 0 && (
                <ul className="mt-1 ml-3 list-disc text-[11px] text-on-surface-variant">
                  {diffs.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
