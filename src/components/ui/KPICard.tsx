import { type ReactNode } from 'react'
import { Icon } from './Icon'

type TrendDir = 'up' | 'down' | 'flat'

interface KPICardProps {
  title:      string
  value:      string | number
  icon:       string
  trend?:     string
  trendDir?:  TrendDir
  alert?:     boolean
  children?:  ReactNode
  className?: string
}

const trendColour: Record<TrendDir, string> = {
  up:   'text-success',
  down: 'text-error',
  flat: 'text-outline',
}

const trendIcon: Record<TrendDir, string> = {
  up:   'arrow_upward',
  down: 'arrow_downward',
  flat: 'remove',
}

export function KPICard({
  title,
  value,
  icon,
  trend,
  trendDir = 'flat',
  alert = false,
  className = '',
}: KPICardProps) {
  return (
    <div
      className={[
        'bg-surface-container-lowest border border-outline-variant rounded-lg p-container-margin',
        'flex flex-col justify-between',
        'hover:shadow-[0_2px_8px_rgba(0,35,111,0.06)] transition-shadow',
        alert ? 'border-l-4 border-l-error' : '',
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-label-mono font-label-mono text-on-surface-variant uppercase tracking-wider text-[11px]">
          {title}
        </span>
        <Icon name={icon} size={20} className="text-outline" />
      </div>

      <div className={`text-display-lg font-display-lg ${alert ? 'text-error' : 'text-primary'}`}>
        {value}
      </div>

      {trend && (
        <div className={`text-label-mono font-label-mono mt-2 flex items-center gap-1 ${trendColour[trendDir]}`}>
          <Icon name={trendIcon[trendDir]} size={14} />
          {trend}
        </div>
      )}
    </div>
  )
}
