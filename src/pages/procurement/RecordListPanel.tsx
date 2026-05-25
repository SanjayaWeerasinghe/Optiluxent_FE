import { useState, useEffect } from 'react'
import { Icon } from '../../components/ui/Icon'
import { apiGet } from '../../lib/api'

const STATUS_COLOR: Record<string, string> = {
  DRAFT:            'bg-secondary',
  CANCELLED:        'bg-error',
  PENDING_APPROVAL: 'bg-warning',
  APPROVED:         'bg-success',
  REJECTED:         'bg-error',
  CONFIRMED:        'bg-success',
  PARTIAL:          'bg-warning',
  RECEIVED:         'bg-success',
  POSTED:           'bg-info',
  PAID:             'bg-success',
  IN_TRANSIT:       'bg-info',
  FULFILLED:        'bg-success',
  IN_PROGRESS:      'bg-info',
  PENDING:          'bg-warning',
  PASSED:           'bg-success',
  FAILED:           'bg-error',
  OVERDUE:          'bg-error',
  FINALIZED:        'bg-success',
  RELEASED:         'bg-info',
  COMPLETED:        'bg-success',
}

const PAGE_SIZE = 8

function fmtValue(v: unknown): string {
  if (v == null || v === '') return ''
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s)
    if (!isNaN(d.getTime()))
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
  }
  return s
}

interface Props {
  endpoint:   string
  currentId:  number | undefined
  idKey?:     string
  onSelect:   (doc: Record<string, unknown>) => void
  subFields?: string[]
}

export function RecordListPanel({ endpoint, currentId, idKey = 'id', onSelect, subFields }: Props) {
  const [all,     setAll]     = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(0)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(endpoint)
      .then(rows => setAll(Array.isArray(rows) ? rows : []))
      .catch(() => setAll([]))
      .finally(() => setLoading(false))
  }, [endpoint])

  const filtered = search
    ? all.filter(r => {
        const q = search.toLowerCase()
        if (String(r.code ?? '').toLowerCase().includes(q)) return true
        return subFields?.some(k => String(r[k] ?? '').toLowerCase().includes(q)) ?? false
      })
    : all

  // Jump to the page containing the current record (only when not searching)
  useEffect(() => {
    if (search || currentId == null || all.length === 0) return
    const idx = all.findIndex(r => r[idKey] === currentId)
    if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE))
  }, [currentId, all, idKey, search])

  // Reset to page 0 when search changes
  useEffect(() => { setPage(0) }, [search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col h-full select-none">
      {/* Search */}
      <div className="px-2 py-2 border-b border-outline-variant shrink-0">
        <div className="relative">
          <Icon name="search" size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-6 pr-2 py-1 text-[11px] bg-surface-container border border-outline-variant rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface placeholder:text-on-surface-variant"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="mx-2 my-1 h-10 rounded bg-surface-container animate-pulse" />
          ))
        ) : pageItems.map(item => {
          const id       = item[idKey] as number
          const code     = String(item.code ?? item[idKey] ?? '—')
          const status   = String(item.status ?? '')
          const isActive = id === currentId
          const dot      = STATUS_COLOR[status] ?? 'bg-outline-variant'
          const subText  = subFields
            ?.map(k => fmtValue(item[k]))
            .filter(Boolean)
            .join(' · ')

          return (
            <button
              key={id}
              onClick={() => onSelect(item)}
              className={[
                'w-full text-left px-3 py-2 flex items-center gap-2 transition-colors',
                isActive
                  ? 'bg-primary-container text-on-primary-container border-r-[3px] border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
              ].join(' ')}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${dot}`} />
              <span className="flex flex-col min-w-0 flex-1">
                <span className="text-[12px] font-mono truncate leading-tight">{code}</span>
                {subText && (
                  <span className={[
                    'text-[10px] truncate leading-tight',
                    isActive ? 'text-on-primary-container/70' : 'text-on-surface-variant/70',
                  ].join(' ')}>
                    {subText}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Pagination */}
      <div className="border-t border-outline-variant px-2 py-1.5 flex items-center justify-between shrink-0">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="p-1 rounded text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-colors"
        >
          <Icon name="chevron_left" size={16} />
        </button>
        <span className="text-[11px] text-on-surface-variant tabular-nums">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="p-1 rounded text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-colors"
        >
          <Icon name="chevron_right" size={16} />
        </button>
      </div>
    </div>
  )
}
