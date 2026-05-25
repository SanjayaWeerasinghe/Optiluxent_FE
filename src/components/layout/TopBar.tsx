import { Icon } from '../ui'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-container-margin">
      {/* Left — mobile menu + brand */}
      <div className="flex items-center gap-4">
        <button
          className="md:hidden p-2 rounded text-on-surface-variant hover:bg-surface-container-low transition-colors"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Icon name="menu" size={22} />
        </button>
      </div>

      {/* Right — search + actions */}
      <div className="flex items-center gap-gutter">
        {/* Global search */}
        <div className="relative hidden sm:block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon name="search" size={16} className="text-outline" />
          </span>
          <input
            type="text"
            placeholder="Search…"
            className="pl-8 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-full text-label-mono font-label-mono text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-56 transition-all"
          />
        </div>

        {/* Notification */}
        <button
          className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
          aria-label="Notifications"
        >
          <Icon name="notifications" size={22} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface-container-lowest" />
        </button>

        {/* Settings shortcut */}
        <button
          className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
          aria-label="Settings"
        >
          <Icon name="settings" size={22} />
        </button>

        {/* Avatar */}
        <button
          className="p-1.5 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
          aria-label="Account"
        >
          <Icon name="account_circle" size={24} />
        </button>
      </div>
    </header>
  )
}
