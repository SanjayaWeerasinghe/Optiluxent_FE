import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Icon } from './Icon'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  icon?:     string
  iconLeft?: string   // alias for icon
  iconRight?: string
  loading?:  boolean
  children?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container border border-transparent',
  secondary: 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant',
  outline:   'bg-transparent text-primary border border-primary hover:bg-primary-fixed',
  ghost:     'bg-transparent text-on-surface-variant hover:bg-surface-container-low border border-transparent',
  danger:    'bg-error text-on-error hover:opacity-90 border border-transparent',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-body-sm font-body-sm',
  md: 'px-container-margin py-2 text-body-sm font-body-sm font-semibold',
  lg: 'px-6 py-3 text-title-sm font-title-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconLeft,
  iconRight,
  loading = false,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const leadIcon = icon ?? iconLeft
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded transition-all',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <Icon name="progress_activity" size={16} className="animate-spin" />
      ) : leadIcon ? (
        <Icon name={leadIcon} size={16} />
      ) : null}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={16} />}
    </button>
  )
}
