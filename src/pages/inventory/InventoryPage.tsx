import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
const MRSection         = lazy(() => import('./MRSection').then(m => ({ default: m.MRSection })))
const TransferSection   = lazy(() => import('./TransferSection').then(m => ({ default: m.TransferSection })))
const IssueSection      = lazy(() => import('./IssueSection').then(m => ({ default: m.IssueSection })))
const AdjustmentSection = lazy(() => import('./AdjustmentSection').then(m => ({ default: m.AdjustmentSection })))
const QCSection         = lazy(() => import('./QCSection').then(m => ({ default: m.QCSection })))
const StockSection      = lazy(() => import('./StockSection').then(m => ({ default: m.StockSection })))
const SectionFallback = () => (
  <div className="py-8 text-center text-on-surface-variant text-body-sm">Loading section…</div>
)

const SECTIONS = [
  { id: 'mr',          label: 'Material Requests',  icon: 'assignment',  subtitle: 'Internal requests for materials and approvals' },
  { id: 'transfers',   label: 'Goods Transfers',    icon: 'swap_horiz',  subtitle: 'Move stock between warehouses' },
  { id: 'issues',      label: 'Goods Issues',       icon: 'output',      subtitle: 'Issue stock for production, sales or other purposes' },
  { id: 'adjustments', label: 'Stock Adjustments',  icon: 'tune',        subtitle: 'Correct stock quantities via stocktake or write-off' },
  { id: 'qc',          label: 'Quality Checks',     icon: 'verified',    subtitle: 'Inspect and record quality control results' },
  { id: 'stock',       label: 'Stock Overview',     icon: 'inventory_2', subtitle: 'View current balances and stock ledger history' },
]

export function InventoryPage() {
  const [searchParams] = useSearchParams()
  const active  = searchParams.get('section') ?? 'mr'
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
          {active === 'mr'          && <MRSection />}
          {active === 'transfers'   && <TransferSection />}
          {active === 'issues'      && <IssueSection />}
          {active === 'adjustments' && <AdjustmentSection />}
          {active === 'qc'          && <QCSection />}
          {active === 'stock'       && <StockSection />}
        </Suspense>
      </div>
    </div>
  )
}
