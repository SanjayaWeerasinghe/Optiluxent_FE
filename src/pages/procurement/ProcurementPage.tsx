import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { PRSection }      from './PRSection'
import { POSection }      from './POSection'
import { GRNSection }     from './GRNSection'
import { InvoiceSection } from './InvoiceSection'

const SECTIONS = [
  { id: 'pr',       label: 'Purchase Requests', icon: 'receipt_long',  subtitle: 'Internal purchase requests and approval workflow' },
  { id: 'po',       label: 'Purchase Orders',   icon: 'shopping_cart', subtitle: 'Orders placed with suppliers' },
  { id: 'grn',      label: 'Goods Receipts',    icon: 'move_to_inbox', subtitle: 'Receive goods against purchase orders' },
  { id: 'invoices', label: 'Purchase Invoices', icon: 'request_quote', subtitle: 'Supplier invoices, posting and payment' },
]

export function ProcurementPage() {
  const [searchParams] = useSearchParams()
  const active  = searchParams.get('section') ?? 'pr'
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
        {active === 'pr'       && <PRSection />}
        {active === 'po'       && <POSection />}
        {active === 'grn'      && <GRNSection />}
        {active === 'invoices' && <InvoiceSection />}
      </div>
    </div>
  )
}
