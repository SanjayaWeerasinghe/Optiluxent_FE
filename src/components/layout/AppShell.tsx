import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar }  from './TopBar'
import { LookupsProvider } from '../../lib/lookups'

interface AppShellProps {
  children:  ReactNode
  noPadding?: boolean
}

export function AppShell({ children, noPadding }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <LookupsProvider>
      <div className="flex min-h-screen bg-background text-on-background antialiased">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content — offset by sidebar width on md+ */}
        <div className="flex-1 flex flex-col md:ml-64 min-w-0">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main className={[
            'flex-1 overflow-x-hidden',
            noPadding ? 'flex flex-col' : 'p-container-margin',
          ].join(' ')}>
            {children}
          </main>
        </div>
      </div>
    </LookupsProvider>
  )
}
