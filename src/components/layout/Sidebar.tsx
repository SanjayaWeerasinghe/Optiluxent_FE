import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../ui'

// ── Data model ────────────────────────────────────────────────────────────────

interface NavLeaf {
  kind:     'leaf'
  label:    string
  icon:     string
  path:     string
  section?: string
}

interface NavGroup {
  kind:      'group'
  id:        string
  label:     string
  icon:      string
  items:     NavLeaf[]
  /** If set, clicking the group header navigates here AND opens the
   * accordion. Chevron alone still toggles the accordion. Modules with a
   * landing dashboard (procurement, inventory, sales, manufacturing) set
   * this; groups without (master data, admin) leave it undefined so the
   * header behaves as a pure accordion toggle. */
  dashUrl?:  string
}

type NavEntry = NavLeaf | NavGroup

const L = (label: string, icon: string, path: string, section?: string): NavLeaf =>
  ({ kind: 'leaf', label, icon, path, section })

const G = (id: string, label: string, icon: string, items: NavLeaf[], dashUrl?: string): NavGroup =>
  ({ kind: 'group', id, label, icon, items, dashUrl })

const NAV: NavEntry[] = [
  L('Dashboard', 'analytics', '/'),

  G('procurement', 'Procurement', 'shopping_cart', [
    L('Dashboard',         'analytics',  '/procurement', 'dashboard'),
    L('Purchase Requests', 'receipt_long',  '/procurement', 'pr'),
    L('Purchase Orders',   'shopping_cart', '/procurement', 'po'),
    L('Goods Receipts',    'move_to_inbox', '/procurement', 'grn'),
    L('Purchase Invoices', 'request_quote', '/procurement', 'invoices'),
  ], '/procurement?section=dashboard'),

  G('inventory', 'Inventory', 'inventory_2', [
    L('Dashboard',         'analytics','/inventory', 'dashboard'),
    L('Material Requests', 'assignment',  '/inventory', 'mr'),
    L('Goods Transfers',   'swap_horiz',  '/inventory', 'transfers'),
    L('Goods Issues',      'output',      '/inventory', 'issues'),
    L('Stock Adjustments', 'tune',        '/inventory', 'adjustments'),
    L('Quality Checks',    'verified',    '/inventory', 'qc'),
    L('Stock Overview',    'inventory_2', '/inventory', 'stock'),
  ], '/inventory?section=dashboard'),

  G('sales', 'Sales', 'point_of_sale', [
    L('Dashboard',      'analytics',      '/sales', 'dashboard'),
    L('Quotations',     'request_quote',  '/sales', 'quotations'),
    L('Sales Orders',   'shopping_bag',   '/sales', 'orders'),
    L('Deliveries',     'local_shipping', '/sales', 'deliveries'),
    L('Sales Invoices', 'receipt',        '/sales', 'invoices'),
  ], '/sales?section=dashboard'),

  G('manufacturing', 'Manufacturing', 'factory', [
    L('Dashboard',        'analytics',               '/manufacturing', 'dashboard'),
    L('Pre-Costing',      'calculate',               '/manufacturing', 'pre-cost'),
    L('Production Plans', 'event_note',              '/manufacturing', 'plans'),
    L('Production',       'precision_manufacturing', '/manufacturing', 'production'),
    L('Post-Costing',     'analytics',               '/manufacturing', 'post-cost'),
  ], '/manufacturing?section=dashboard'),

  G('data', 'Master Data', 'database', [
    L('Organization',  'domain',                  '/master-data', 'organization'),
    L('Financial',     'account_balance',         '/master-data', 'financial'),
    L('Contacts',      'handshake',               '/master-data', 'contacts'),
    L('Products',      'inventory',               '/master-data', 'products'),
    L('Manufacturing', 'precision_manufacturing', '/master-data', 'manufacturing'),
    L('HR',            'badge',                   '/master-data', 'hr'),
    L('Inventory',     'warehouse',               '/master-data', 'inventory'),
    L('Mat. Categories','folder_open',  '/master-data', 'material-categories'),
    L('Materials',      'layers',       '/master-data', 'materials'),
  ]),

  G('admin', 'Administration', 'admin_panel_settings', [
    L('Users',       'person',   '/admin', 'users'),
    L('Roles',       'badge',    '/admin', 'roles'),
    L('Permissions', 'verified', '/admin', 'permissions'),
    L('System',      'settings', '/system'),
  ]),
]

// ── Active helpers ────────────────────────────────────────────────────────────

function leafActive(leaf: NavLeaf, pathname: string, search: string): boolean {
  if (leaf.path === '/') return pathname === '/'
  if (pathname !== leaf.path) return false
  if (!leaf.section) return true
  return new URLSearchParams(search).get('section') === leaf.section
}

function groupHasActive(grp: NavGroup, pathname: string, search: string): boolean {
  return grp.items.some(l => leafActive(l, pathname, search))
}

function leafUrl(leaf: NavLeaf): string {
  return leaf.section ? `${leaf.path}?section=${leaf.section}` : leaf.path
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  open:    boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()

  const groups = NAV.filter((e): e is NavGroup => e.kind === 'group')

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const s = new Set<string>(['procurement'])
    for (const g of groups) {
      if (groupHasActive(g, pathname, search)) s.add(g.id)
    }
    return s
  })

  useEffect(() => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      for (const g of groups) {
        if (groupHasActive(g, pathname, search)) next.add(g.id)
      }
      return next
    })
  }, [pathname, search]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setOpenGroups(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-inverse-surface/40 z-30 md:hidden" onClick={onClose} />
      )}

      <nav
        aria-label="Main Navigation"
        className={[
          'fixed left-0 top-0 h-screen w-64 flex flex-col z-40',
          'bg-surface-container border-r border-outline-variant',
          'transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="h-16 px-container-margin border-b border-outline-variant flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 bg-primary rounded flex items-center justify-center text-on-primary font-bold text-lg select-none">
            O
          </div>
          <div>
            <h1 className="text-body-md font-body-md font-black text-primary leading-none">
              Optiluxent
            </h1>
            <span className="text-[10px] font-label-mono text-on-surface-variant uppercase tracking-wider">
              Enterprise ERP
            </span>
          </div>
        </div>

        {/* Nav */}
        <ul className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-0">
          {NAV.map(entry => {
            if (entry.kind === 'leaf') {
              const active = leafActive(entry, pathname, search)
              return (
                <li key={entry.path}>
                  <Link
                    to={leafUrl(entry)}
                    onClick={onClose}
                    className={[
                      'flex items-center gap-3 px-3 py-2 rounded text-body-sm font-body-sm transition-all',
                      active
                        ? 'bg-primary-container text-on-primary-container font-semibold border-r-[3px] border-primary rounded-r-none'
                        : 'text-on-surface-variant hover:bg-surface-container-high',
                    ].join(' ')}
                  >
                    <Icon name={entry.icon} size={20} filled={active} />
                    {entry.label}
                  </Link>
                </li>
              )
            }

            // Group accordion
            const grp       = entry as NavGroup
            const isOpen    = openGroups.has(grp.id)
            const hasActive = groupHasActive(grp, pathname, search)

            return (
              <li key={grp.id} className="mt-0.5">
                {/* Group header — main body navigates to dashboard (if any)
                    and opens the accordion; chevron alone toggles open/closed. */}
                <div className={[
                  'flex items-center rounded transition-colors',
                  hasActive && !isOpen
                    ? 'text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                ].join(' ')}>
                  <button
                    onClick={() => {
                      if (grp.dashUrl) {
                        navigate(grp.dashUrl)
                        setOpenGroups(prev => {
                          if (prev.has(grp.id)) return prev
                          const next = new Set(prev); next.add(grp.id)
                          return next
                        })
                        onClose()
                      } else {
                        toggle(grp.id)
                      }
                    }}
                    className="flex-1 flex items-center gap-2.5 px-3 py-2 text-left text-body-sm font-body-sm"
                  >
                    <Icon name={grp.icon} size={20} filled={hasActive} />
                    <span>{grp.label}</span>
                  </button>
                  <button
                    onClick={() => toggle(grp.id)}
                    aria-label={isOpen ? `Collapse ${grp.label}` : `Expand ${grp.label}`}
                    className="p-2 mr-1 rounded hover:bg-surface-container-highest"
                  >
                    <Icon
                      name="chevron_right"
                      size={16}
                      className={`transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                    />
                  </button>
                </div>

                {/* Children */}
                <ul
                  className={`overflow-hidden transition-all duration-200 ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  {grp.items.map(leaf => {
                    const active = leafActive(leaf, pathname, search)
                    return (
                      <li key={leafUrl(leaf)}>
                        <Link
                          to={leafUrl(leaf)}
                          onClick={onClose}
                          className={[
                            'flex items-center gap-2 pl-9 pr-3 py-[6px] rounded text-body-sm font-body-sm transition-all',
                            active
                              ? 'bg-primary-container text-on-primary-container font-semibold border-r-[3px] border-primary rounded-r-none'
                              : 'text-on-surface-variant hover:bg-surface-container-high',
                          ].join(' ')}
                        >
                          <Icon name={leaf.icon} size={16} filled={active} />
                          {leaf.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>

        {/* Footer */}
        <div className="border-t border-outline-variant p-2 flex flex-col gap-0.5 shrink-0">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded text-body-sm font-body-sm text-on-surface-variant hover:bg-surface-container-high transition-all"
          >
            <Icon name="help" size={20} />
            Help Center
          </a>
          <button
            className="flex items-center gap-3 px-3 py-2 rounded text-body-sm font-body-sm text-on-surface-variant hover:bg-surface-container-high transition-all w-full text-left"
            onClick={() => {
              localStorage.removeItem('access_token')
              window.location.href = '/login'
            }}
          >
            <Icon name="logout" size={20} />
            Logout
          </button>
        </div>
      </nav>
    </>
  )
}
