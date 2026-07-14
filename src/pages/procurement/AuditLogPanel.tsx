import { useState, useEffect, useCallback } from 'react'
import { Icon } from '../../components/ui/Icon'
import { Badge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { useLookupLabel } from '../../lib/lookups'

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

function actionVariant(action: string) {
  if (action === 'CREATE') return 'success' as const
  if (action === 'DELETE') return 'error' as const
  if (action === 'UPDATE') return 'info' as const
  return 'secondary' as const
}

// Extract the workflow verb from a POST path — /some-doc/:id/confirm →
// "confirm". Falls back to the raw action if no workflow segment matches.
function verbFromLog(log: AuditLog): string {
  // The audit payload doesn't carry the full path today; use the action + a
  // heuristic. When action is CREATE we peek at new_values for a `status`
  // to guess a workflow transition.
  const nv = log.new_values as Record<string, unknown> | null
  if (nv && typeof nv === 'object' && 'reason' in nv) return 'rejected'
  if (nv && typeof nv === 'object' && 'amount' in nv) return 'recorded payment on'
  return log.action.toLowerCase()
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
          const userName = log.user_id ? format('user', log.user_id) : 'system'
          const verb     = verbFromLog(log)
          const diffs    = describeDiff(log.new_values, log.old_values)
          return (
            <div
              key={log.id}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                  <span className="text-[11px] text-on-surface font-semibold">{userName}</span>
                </div>
                <span className="text-[10px] text-on-surface-variant">{formatTs(log.created_at)}</span>
              </div>
              <div className="text-[12px] text-on-surface-variant leading-relaxed">
                {log.action === 'CREATE' && `${userName} created this ${resource.replace(/-/g, ' ').replace(/s$/, '')}.`}
                {log.action === 'DELETE' && `${userName} deleted this record.`}
                {log.action === 'UPDATE' && diffs.length === 0 && `${userName} ${verb} this record.`}
                {log.action === 'UPDATE' && diffs.length > 0 && (
                  <>
                    <span>{userName} changed:</span>
                    <ul className="mt-0.5 ml-3 list-disc text-[11px]">
                      {diffs.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
