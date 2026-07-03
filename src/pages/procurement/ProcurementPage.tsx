import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
// Sections are lazy-loaded — only the active section's chunk is fetched.
// Cuts cold-load of /procurement by ~80% (was pulling all 4 section trees).
const DashboardSection = lazy(() => import('./DashboardSection').then(m => ({ default: m.DashboardSection })))
const PRSection      = lazy(() => import('./PRSection').then(m => ({ default: m.PRSection })))
const POSection      = lazy(() => import('./POSection').then(m => ({ default: m.POSection })))
const GRNSection     = lazy(() => import('./GRNSection').then(m => ({ default: m.GRNSection })))
const InvoiceSection = lazy(() => import('./InvoiceSection').then(m => ({ default: m.InvoiceSection })))

const SectionFallback = () => (
  <div className="py-8 text-center text-on-surface-variant text-body-sm">Loading section…</div>
)

const SECTIONS = [
  { id: 'dashboard',label: 'Dashboard',         icon: 'analytics',     subtitle: 'Requests, POs, GRNs and spend at a glance' },
  { id: 'pr',       label: 'Purchase Requests', icon: 'receipt_long',  subtitle: 'Internal purchase requests and approval workflow' },
  { id: 'po',       label: 'Purchase Orders',   icon: 'shopping_cart', subtitle: 'Orders placed with suppliers' },
  { id: 'grn',      label: 'Goods Receipts',    icon: 'move_to_inbox', subtitle: 'Receive goods against purchase orders' },
  { id: 'invoices', label: 'Purchase Invoices', icon: 'request_quote', subtitle: 'Supplier invoices, posting and payment' },
]

export function ProcurementPage() {
  const [searchParams] = useSearchParams()
  const active  = searchParams.get('section') ?? 'dashboard'
  const section = SECTIONS.find(s => s.id === active) ?? SECTIONS[0]

  return (
    <div className="h-full overflow-y-auto p-container-margin">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
            <Icon name={section.icon} size={18} filled className="text-primary" />
          </div>
          <h1 className="text-headline-md font-headline-md text-on-background">{section.label}</h1>
        </div>
        <p className="text-body-sm font-body-sm text-on-surface-variant ml-11">{section.subtitle}</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-container-margin shadow-sm">
        <Suspense fallback={<SectionFallback />}>
          {active === 'dashboard'&& <DashboardSection />}
          {active === 'pr'       && <PRSection />}
          {active === 'po'       && <POSection />}
          {active === 'grn'      && <GRNSection />}
          {active === 'invoices' && <InvoiceSection />}
        </Suspense>
      </div>
    </div>
  )
}
