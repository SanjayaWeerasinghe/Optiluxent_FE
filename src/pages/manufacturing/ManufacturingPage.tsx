import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { PreCostSection }    from './PreCostSection'
import { PlanSection }       from './PlanSection'
import { ProductionSection } from './ProductionSection'
import { PostCostSection }   from './PostCostSection'

const SECTIONS = [
  { id: 'pre-cost',   label: 'Pre-Costing',      icon: 'calculate',               subtitle: 'Estimate material, resource and overhead costs before production' },
  { id: 'plans',      label: 'Production Plans',  icon: 'event_note',              subtitle: 'Schedule and manage planned production runs' },
  { id: 'production', label: 'Production',        icon: 'precision_manufacturing', subtitle: 'Record products manufactured and resources consumed' },
  { id: 'post-cost',  label: 'Post-Costing',      icon: 'analytics',               subtitle: 'Analyse actual vs estimated costs and variance after production' },
]

export function ManufacturingPage() {
  const [searchParams] = useSearchParams()
  const active  = searchParams.get('section') ?? 'pre-cost'
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
        {active === 'pre-cost'   && <PreCostSection />}
        {active === 'plans'      && <PlanSection />}
        {active === 'production' && <ProductionSection />}
        {active === 'post-cost'  && <PostCostSection />}
      </div>
    </div>
  )
}
