import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'

const sizeClass = {
  sm:    'max-w-sm',
  md:    'max-w-lg',
  lg:    'max-w-2xl',
  xl:    'max-w-4xl',
  '2xl': 'max-w-6xl',
  '3xl': 'max-w-7xl',
}

interface ModalProps {
  isOpen:       boolean
  onClose:      () => void
  title:        ReactNode
  children:     ReactNode
  footer?:      ReactNode
  size?:        'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  headerExtra?: ReactNode
  panel?:       ReactNode
  leftPanel?:   ReactNode
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md', headerExtra, panel, leftPanel }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={[
          'relative w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_8px_32px_rgba(0,35,111,0.12)]',
          sizeClass[size],
        ].join(' ')}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="text-title-sm font-title-sm text-on-background">{title}</h2>
          <div className="flex items-center gap-1">
            {headerExtra}
            <button
              onClick={onClose}
              className="p-1 rounded text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        {leftPanel || panel ? (
          <div className="flex h-[68vh] min-h-0 overflow-hidden rounded-b-xl">
            {leftPanel && (
              <div className="w-56 shrink-0 border-r border-outline-variant overflow-hidden bg-surface-container-low flex flex-col">
                {leftPanel}
              </div>
            )}
            <div className="flex-1 px-6 py-5 overflow-y-auto min-w-0">{children}</div>
            {panel && (
              <div className="w-72 shrink-0 border-l border-outline-variant overflow-y-auto bg-surface-container-low">
                {panel}
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
        )}

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-4 border-t border-outline-variant bg-surface-container-low ${leftPanel || panel ? '' : 'rounded-b-xl'}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
