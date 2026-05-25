import { useState, useEffect, useCallback } from 'react'
import { Icon } from '../../components/ui/Icon'
import { Badge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'

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

function formatTs(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function actionVariant(action: string) {
  if (action === 'CREATE') return 'success' as const
  if (action === 'DELETE') return 'error' as const
  if (action === 'UPDATE') return 'info' as const
  return 'secondary' as const
}

function JsonPreview({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false)
  if (!data) return null
  const preview = JSON.stringify(data)
  if (preview === '{}' || preview === 'null') return null
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <Icon name={open ? 'expand_less' : 'expand_more'} size={12} />
        {open ? 'hide' : 'show'} values
      </button>
      {open && (
        <pre className="mt-1 p-2 rounded bg-surface-container text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all text-on-surface font-mono max-h-40">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

export function AuditLogPanel({ resource, resourceId }: Props) {
  const [logs,    setLogs]    = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

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
          <span className="text-[11px] font-semibold uppercase tracking-wider">Audit Log</span>
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

        {!loading && logs.map(log => (
          <div
            key={log.id}
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <Badge variant={actionVariant(log.action)}>
                {log.action}
              </Badge>
              {log.user_id && (
                <span className="text-[10px] text-on-surface-variant font-mono">
                  uid:{log.user_id}
                </span>
              )}
            </div>
            <div className="text-[11px] text-on-surface-variant">
              {formatTs(log.created_at)}
            </div>
            <JsonPreview data={log.new_values ?? log.old_values} />
          </div>
        ))}
      </div>
    </div>
  )
}
