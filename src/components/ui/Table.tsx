import { type ReactNode } from 'react'

const STATUS_BORDER: Record<string, string> = {
  DRAFT:            'border-l-secondary',
  CANCELLED:        'border-l-error',
  PENDING_APPROVAL: 'border-l-warning',
  APPROVED:         'border-l-success',
  REJECTED:         'border-l-error',
  CONFIRMED:        'border-l-success',
  PARTIAL:          'border-l-warning',
  RECEIVED:         'border-l-success',
  POSTED:           'border-l-info',
  PAID:             'border-l-success',
  IN_TRANSIT:       'border-l-info',
  FULFILLED:        'border-l-success',
  IN_PROGRESS:      'border-l-info',
  PENDING:          'border-l-warning',
  PASSED:           'border-l-success',
  FAILED:           'border-l-error',
  OVERDUE:          'border-l-error',
  FINALIZED:        'border-l-success',
  RELEASED:         'border-l-info',
  COMPLETED:        'border-l-success',
}

function rowBorderClass(row: Record<string, unknown>): string {
  return STATUS_BORDER[String(row.status ?? '')] ?? 'border-l-transparent'
}

// Postgres DATE columns come back through Go as full RFC3339 datetimes
// (e.g. "2026-07-12T00:00:00Z"). Show them as yyyy-MM-dd in table cells so
// lists don't leak the T00:00:00Z suffix.
const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

function formatCellValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string' && ISO_DATE_TIME_RE.test(v)) return v.slice(0, 10)
  return String(v)
}

export interface Column<T> {
  header:  string
  key:     string
  render?: (row: T) => ReactNode
  width?:  string
  align?:  'left' | 'center' | 'right'
}

interface TableProps<T extends Record<string, unknown>> {
  columns:      Column<T>[]
  data:         T[]
  loading?:     boolean
  empty?:       string
  rowKey?:      keyof T
  onRowClick?:  (row: T) => void
}

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' }

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  empty = 'No records found',
  rowKey = 'id' as keyof T,
  onRowClick,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="border border-outline-variant rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-container-low border-b border-outline-variant">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className="px-4 py-2.5 text-left text-table-header font-table-header text-on-surface-variant"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-outline-variant last:border-0">
                {columns.map((col, ci) => (
                  <td key={col.key} className={`px-4 py-3 ${ci === 0 ? 'border-l-[3px] border-l-outline-variant' : ''}`}>
                    <div className="h-3.5 bg-surface-container rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="border border-outline-variant rounded-lg">
        <table className="w-full">
          <thead className="bg-surface-container-low border-b border-outline-variant">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className="px-4 py-2.5 text-left text-table-header font-table-header text-on-surface-variant"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="py-12 text-center text-body-sm font-body-sm text-on-surface-variant">
          {empty}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-outline-variant rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface-container-low border-b border-outline-variant">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={[
                  'px-4 py-2.5 text-table-header font-table-header text-on-surface-variant',
                  alignClass[col.align ?? 'left'],
                ].join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={String(row[rowKey] ?? idx)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={[
                'border-b border-outline-variant last:border-0 transition-colors',
                idx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/40',
                'hover:bg-primary/5',
                onRowClick ? 'cursor-pointer' : '',
              ].join(' ')}
            >
              {columns.map((col, ci) => (
                <td
                  key={col.key}
                  className={[
                    'px-4 py-3 text-body-sm font-body-sm text-on-surface',
                    alignClass[col.align ?? 'left'],
                    ci === 0 ? `border-l-[3px] ${rowBorderClass(row)}` : '',
                  ].join(' ')}
                >
                  {col.render
                    ? col.render(row)
                    : formatCellValue(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
