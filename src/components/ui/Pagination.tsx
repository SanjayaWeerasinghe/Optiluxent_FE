import { Icon } from './Icon'

interface PaginationProps {
  page:      number
  perPage:   number
  total:     number
  onPage:    (page: number) => void
  onPerPage: (perPage: number) => void
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100]

function pageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

export function Pagination({ page, perPage, total, onPage, onPerPage }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to   = Math.min(page * perPage, total)

  return (
    <div className="flex items-center justify-between mt-3 px-1 flex-wrap gap-y-2">
      {/* Count */}
      <span className="text-label-mono font-label-mono text-on-surface-variant shrink-0">
        {total === 0 ? 'No records' : `${from}–${to} of ${total}`}
      </span>

      <div className="flex items-center gap-3">
        {/* Per-page selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-label-mono font-label-mono text-on-surface-variant">Rows:</span>
          <select
            value={perPage}
            onChange={e => { onPerPage(Number(e.target.value)); onPage(1) }}
            className="text-body-sm font-body-sm text-on-surface bg-surface-container border border-outline-variant rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {PER_PAGE_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Page nav */}
        <div className="flex items-center gap-0.5">
          <NavBtn
            icon="first_page"
            disabled={page <= 1}
            onClick={() => onPage(1)}
            title="First page"
          />
          <NavBtn
            icon="chevron_left"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            title="Previous page"
          />

          {pageRange(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="w-8 text-center text-label-mono font-label-mono text-on-surface-variant">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p as number)}
                className={[
                  'w-8 h-7 rounded text-body-sm font-body-sm transition-colors',
                  p === page
                    ? 'bg-primary text-on-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high',
                ].join(' ')}
              >
                {p}
              </button>
            )
          )}

          <NavBtn
            icon="chevron_right"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            title="Next page"
          />
          <NavBtn
            icon="last_page"
            disabled={page >= totalPages}
            onClick={() => onPage(totalPages)}
            title="Last page"
          />
        </div>
      </div>
    </div>
  )
}

function NavBtn({ icon, disabled, onClick, title }: {
  icon: string; disabled: boolean; onClick: () => void; title: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <Icon name={icon} size={18} />
    </button>
  )
}
