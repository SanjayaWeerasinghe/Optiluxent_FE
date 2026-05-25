import { type SelectHTMLAttributes, forwardRef } from 'react'
import { Icon } from './Icon'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string
  error?:    string
  options:   SelectOption[]
  placeholder?: string
  required?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, required, className = '', id, ...rest }, ref) => {
    return (
      <div className="flex flex-col gap-unit">
        {label && (
          <label htmlFor={id} className="text-label-mono font-label-mono text-on-surface-variant">
            {label}
            {required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={[
              'w-full appearance-none bg-surface-container-lowest border rounded',
              'px-component-padding-x py-component-padding-y pr-10',
              'text-body-md font-body-md text-on-surface',
              'focus:outline-none focus:ring-1 transition-all',
              error
                ? 'border-error focus:border-error focus:ring-error'
                : 'border-outline-variant focus:border-primary focus:ring-primary',
              rest.disabled ? 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-70' : '',
              className,
            ].join(' ')}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
            <Icon name="expand_more" size={20} />
          </span>
        </div>
        {error && (
          <p className="text-label-mono font-label-mono text-error flex items-center gap-1">
            <Icon name="error" size={14} />
            {error}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'
