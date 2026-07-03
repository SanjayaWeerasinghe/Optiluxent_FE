import { Icon } from '../ui/Icon'

type Accent = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'

const CLS: Record<Accent, string> = {
  primary: 'bg-primary/5 border-primary/20 text-primary',
  success: 'bg-success/10 border-success/20 text-success',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  error:   'bg-error/10 border-error/20 text-error',
  info:    'bg-info/10 border-info/20 text-info',
  neutral: 'bg-surface-container-low border-outline-variant text-on-surface',
}

interface Props {
  label:    string
  value:    string | number
  sub?:     string
  icon?:    string
  accent?:  Accent
  loading?: boolean
}

// Single dashboard KPI tile. Consistent 4-across grid on desktop, wraps down.
export function StatTile({ label, value, sub, icon, accent = 'neutral', loading }: Props) {
  return (
    <div className={`p-4 rounded-lg border ${CLS[accent]} min-w-0`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant">
          {label}
        </div>
        {icon && <Icon name={icon} size={16} className="opacity-60" />}
      </div>
      <div className="text-title-lg font-title-md mt-1 truncate">
        {loading ? <span className="text-body-md text-on-surface-variant">…</span> : value}
      </div>
      {sub && !loading && (
        <div className="text-body-sm text-on-surface-variant mt-0.5 truncate">{sub}</div>
      )}
    </div>
  )
}
