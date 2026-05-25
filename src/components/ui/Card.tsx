import { type ReactNode } from 'react'

interface CardProps {
  children:  ReactNode
  className?: string
  noPadding?: boolean
}

export function Card({ children, className = '', noPadding = false }: CardProps) {
  return (
    <div
      className={[
        'bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm',
        noPadding ? '' : 'p-container-margin',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title:    string
  subtitle?: string
  action?:  ReactNode
  icon?:    string
}

export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
            {icon}
          </span>
        )}
        <div>
          <h3 className="text-title-sm font-title-sm text-on-background">{title}</h3>
          {subtitle && <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

interface SectionCardProps {
  title:     string
  icon?:     string
  children:  ReactNode
  action?:   ReactNode
  className?: string
}

export function SectionCard({ title, icon, children, action, className = '' }: SectionCardProps) {
  return (
    <Card noPadding className={className}>
      <div className="px-container-margin py-component-padding-y border-b border-outline-variant flex items-center justify-between">
        <h3 className="text-title-sm font-title-sm text-on-background flex items-center gap-2">
          {icon && (
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
              {icon}
            </span>
          )}
          {title}
        </h3>
        {action}
      </div>
      <div className="p-container-margin">{children}</div>
    </Card>
  )
}
