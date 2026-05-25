import { type InputHTMLAttributes, forwardRef } from 'react'
import { Icon } from './Icon'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string
  error?:    string
  iconLeft?: string
  iconRight?: string
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, iconLeft, iconRight, required, className = '', id, ...rest }, ref) => {
    return (
      <div className="flex flex-col gap-unit">
        {label && (
          <label htmlFor={id} className="text-label-mono font-label-mono text-on-surface-variant">
            {label}
            {required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              <Icon name={iconLeft} size={18} />
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={[
              'w-full bg-surface-container-lowest border rounded py-component-padding-y text-body-md font-body-md text-on-surface',
              'placeholder:text-on-surface-variant',
              'focus:outline-none focus:ring-1 transition-all',
              error
                ? 'border-error focus:border-error focus:ring-error'
                : 'border-outline-variant focus:border-primary focus:ring-primary',
              iconLeft  ? 'pl-9'   : 'pl-component-padding-x',
              iconRight ? 'pr-9'   : 'pr-component-padding-x',
              rest.readOnly || rest.disabled
                ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                : '',
              className,
            ].join(' ')}
            {...rest}
          />
          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
              <Icon name={iconRight} size={18} />
            </span>
          )}
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
Input.displayName = 'Input'
