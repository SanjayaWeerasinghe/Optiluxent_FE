import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
const DashboardSection    = lazy(() => import('./DashboardSection').then(m => ({ default: m.DashboardSection })))
const SQSection           = lazy(() => import('./SQSection').then(m => ({ default: m.SQSection })))
const SOSection           = lazy(() => import('./SOSection').then(m => ({ default: m.SOSection })))
const DeliverySection     = lazy(() => import('./DeliverySection').then(m => ({ default: m.DeliverySection })))
const SalesInvoiceSection = lazy(() => import('./SalesInvoiceSection').then(m => ({ default: m.SalesInvoiceSection })))
const SectionFallback = () => (
  <div className="py-8 text-center text-on-surface-variant text-body-sm">Loading section…</div>
)

const SECTIONS = [
  { id: 'dashboard',  label: 'Dashboard',      icon: 'analytics',      subtitle: 'Revenue, orders, deliveries and invoices at a glance' },
  { id: 'quotations', label: 'Quotations',     icon: 'request_quote',  subtitle: 'Price quotes to customers — accept to convert into a Sales Order' },
  { id: 'orders',     label: 'Sales Orders',   icon: 'shopping_bag',   subtitle: 'Customer orders, confirmations and delivery tracking' },
  { id: 'deliveries', label: 'Deliveries',     icon: 'local_shipping', subtitle: 'Goods dispatched to customers and stock decrements' },
  { id: 'invoices',   label: 'Sales Invoices', icon: 'receipt',        subtitle: 'Customer invoices, posting and payment collection' },
]

export function SalesPage() {
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
          {active === 'dashboard'  && <DashboardSection />}
          {active === 'quotations' && <SQSection />}
          {active === 'orders'     && <SOSection />}
          {active === 'deliveries' && <DeliverySection />}
          {active === 'invoices'   && <SalesInvoiceSection />}
        </Suspense>
      </div>
    </div>
  )
}
