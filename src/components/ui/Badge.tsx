import { type ReactNode } from 'react'

// Status badge colours follow the semantic strategy from DESIGN.md:
//   success (Emerald)  → Approved, Paid, Confirmed, Passed, Fulfilled, Received
//   warning (Amber)    → Pending, Partial, Low-Stock, Draft (soft)
//   info    (Sky)      → In-Transit, In-Progress, Posted, Confirmed (info)
//   error   (Rose)     → Rejected, Cancelled, Failed, Overdue
//   secondary (Slate)  → Draft, Cancelled (neutral)
type BadgeVariant = 'success' | 'warning' | 'info' | 'error' | 'secondary' | 'primary'

interface BadgeProps {
  variant:  BadgeVariant
  children: ReactNode
  dot?:     boolean
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success:   'bg-success/10 text-success border-success/20',
  warning:   'bg-warning/10 text-warning border-warning/20',
  info:      'bg-info/10 text-info border-info/20',
  error:     'bg-error-container text-on-error-container border-error/20',
  secondary: 'bg-secondary/10 text-secondary border-secondary/20',
  primary:   'bg-primary/10 text-primary border-primary/20',
}

const dotClasses: Record<BadgeVariant, string> = {
  success:   'bg-success',
  warning:   'bg-warning',
  info:      'bg-info',
  error:     'bg-error',
  secondary: 'bg-secondary',
  primary:   'bg-primary',
}

export function Badge({ variant, children, dot, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-label-mono font-label-mono font-semibold border',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotClasses[variant]}`} />}
      {children}
    </span>
  )
}

// ── Status badge — maps ERP document statuses to badge variants ──────────────
const STATUS_MAP: Record<string, BadgeVariant> = {
  // Generic
  DRAFT:           'secondary',
  CANCELLED:       'error',

  // Procurement
  PENDING_APPROVAL: 'warning',
  APPROVED:        'success',
  REJECTED:        'error',
  CONFIRMED:       'success',
  PARTIAL:         'warning',
  RECEIVED:        'success',
  POSTED:          'info',
  PAID:            'success',

  // Inventory
  IN_TRANSIT:      'info',
  FULFILLED:       'success',
  IN_PROGRESS:     'info',
  PENDING:         'warning',
  PASSED:          'success',
  FAILED:          'error',

  // Purchase Invoice
  OVERDUE:         'error',
}

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_MAP[status] ?? 'secondary'
  const label   = status.replace(/_/g, ' ')
  return <Badge variant={variant}>{label}</Badge>
}
