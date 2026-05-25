import { Icon } from './Icon'

export interface TabItem {
  id:    string
  label: string
  icon?: string
}

interface TabsProps {
  tabs:     TabItem[]
  active:   string
  onChange: (id: string) => void
  size?:    'sm' | 'md'
}

export function Tabs({ tabs, active, onChange, size = 'md' }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-outline-variant pb-0">
      {tabs.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 -mb-px border-b-2 transition-all',
              size === 'sm' ? 'text-label-mono font-label-mono' : 'text-body-sm font-body-sm',
              isActive
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline',
            ].join(' ')}
          >
            {tab.icon && <Icon name={tab.icon} size={size === 'sm' ? 14 : 16} filled={isActive} />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
