import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { OrganizationSection }          from './sections/OrganizationSection'
import { FinancialSection }             from './sections/FinancialSection'
import { ContactsSection }              from './sections/ContactsSection'
import { ProductsSection }              from './sections/ProductsSection'
import { ManufacturingSection }         from './sections/ManufacturingSection'
import { HRSection }                    from './sections/HRSection'
import { InventorySection }             from './sections/InventorySection'
import { MaterialCategoriesSection }   from './sections/MaterialCategoriesSection'
import { MaterialsSection }            from './sections/MaterialsSection'
import { DocumentTypesSection }        from './sections/DocumentTypesSection'

const SECTIONS = [
  { id: 'organization',        label: 'Organization',         icon: 'domain',                  subtitle: 'Departments, fiscal years, document sequences' },
  { id: 'financial',           label: 'Financial',            icon: 'account_balance',         subtitle: 'Currencies, payment terms, COA, taxes, banks' },
  { id: 'contacts',            label: 'Contacts',             icon: 'handshake',               subtitle: 'Business partners, customers, suppliers' },
  { id: 'products',            label: 'Products',             icon: 'inventory',               subtitle: 'Categories, units of measure, product catalogue' },
  { id: 'manufacturing',       label: 'Manufacturing',        icon: 'precision_manufacturing', subtitle: 'Work centers, BOMs, production routings' },
  { id: 'hr',                  label: 'HR',                   icon: 'badge',                   subtitle: 'Job positions, employees' },
  { id: 'inventory',           label: 'Inventory',            icon: 'warehouse',               subtitle: 'Warehouses, storage locations' },
  { id: 'material-categories', label: 'Material Categories',  icon: 'folder_open',             subtitle: 'Hierarchical material category tree' },
  { id: 'materials',           label: 'Materials',            icon: 'layers',                  subtitle: 'Raw materials, semi-finished goods, services' },
  { id: 'document-types',      label: 'Document Types',       icon: 'category',                subtitle: 'Per-document classifications with custom picker fields' },
]

export function MasterDataPage() {
  const [searchParams] = useSearchParams()
  const active  = searchParams.get('section') ?? 'organization'
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
        {active === 'organization'        && <OrganizationSection />}
        {active === 'financial'           && <FinancialSection />}
        {active === 'contacts'            && <ContactsSection />}
        {active === 'products'            && <ProductsSection />}
        {active === 'manufacturing'       && <ManufacturingSection />}
        {active === 'hr'                  && <HRSection />}
        {active === 'inventory'           && <InventorySection />}
        {active === 'material-categories' && <MaterialCategoriesSection />}
        {active === 'materials'           && <MaterialsSection />}
        {active === 'document-types'      && <DocumentTypesSection />}
      </div>
    </div>
  )
}
