import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
const DashboardSection  = lazy(() => import('./DashboardSection').then(m => ({ default: m.DashboardSection })))
const PreCostSection    = lazy(() => import('./PreCostSection').then(m => ({ default: m.PreCostSection })))
const PlanSection       = lazy(() => import('./PlanSection').then(m => ({ default: m.PlanSection })))
const ProductionSection = lazy(() => import('./ProductionSection').then(m => ({ default: m.ProductionSection })))
const PostCostSection   = lazy(() => import('./PostCostSection').then(m => ({ default: m.PostCostSection })))
const SectionFallback = () => (
  <div className="py-8 text-center text-on-surface-variant text-body-sm">Loading section…</div>
)

const SECTIONS = [
  { id: 'dashboard',  label: 'Dashboard',         icon: 'analytics',               subtitle: 'Overview of production activity, planned vs produced, QC + wastage' },
  { id: 'pre-cost',   label: 'Pre-Costing',      icon: 'calculate',               subtitle: 'Estimate material, resource and overhead costs before production' },
  { id: 'plans',      label: 'Production Plans',  icon: 'event_note',              subtitle: 'Schedule and manage planned production runs' },
  { id: 'production', label: 'Production',        icon: 'precision_manufacturing', subtitle: 'Record products manufactured and resources consumed' },
  { id: 'post-cost',  label: 'Post-Costing',      icon: 'analytics',               subtitle: 'Analyse actual vs estimated costs and variance after production' },
]

export function ManufacturingPage() {
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
          {active === 'pre-cost'   && <PreCostSection />}
          {active === 'plans'      && <PlanSection />}
          {active === 'production' && <ProductionSection />}
          {active === 'post-cost'  && <PostCostSection />}
        </Suspense>
      </div>
    </div>
  )
}
