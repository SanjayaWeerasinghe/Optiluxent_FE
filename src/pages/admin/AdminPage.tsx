import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'

const UsersSection       = lazy(() => import('./UsersSection').then(m => ({ default: m.UsersSection })))
const RolesSection       = lazy(() => import('./RolesSection').then(m => ({ default: m.RolesSection })))
const PermissionsSection = lazy(() => import('./PermissionsSection').then(m => ({ default: m.PermissionsSection })))

const SECTIONS = [
  { id: 'users',       label: 'Users',       icon: 'person',   subtitle: 'Manage user accounts and assign roles' },
  { id: 'roles',       label: 'Roles',       icon: 'badge',    subtitle: 'Define roles and attach permissions' },
  { id: 'permissions', label: 'Permissions', icon: 'verified', subtitle: 'Catalog of permissions defined in code' },
]

const SectionFallback = () => (
  <div className="py-8 text-center text-on-surface-variant text-body-sm">Loading section…</div>
)

export function AdminPage() {
  const [searchParams] = useSearchParams()
  const active  = searchParams.get('section') ?? 'users'
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
          {active === 'users'       && <UsersSection />}
          {active === 'roles'       && <RolesSection />}
          {active === 'permissions' && <PermissionsSection />}
        </Suspense>
      </div>
    </div>
  )
}
