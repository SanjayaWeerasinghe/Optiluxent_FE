import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout'

// Each page is code-split. In dev this means /login only fetches LoginPage + its
// own deps instead of every module's deep tree (procurement, inventory, sales,
// manufacturing — hundreds of files). Cold-load drops from ~seconds to <1s.
const LoginPage         = lazy(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage     = lazy(() => import('../pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const MasterDataPage    = lazy(() => import('../pages/master-data/MasterDataPage').then(m => ({ default: m.MasterDataPage })))
const ProcurementPage   = lazy(() => import('../pages/procurement/ProcurementPage').then(m => ({ default: m.ProcurementPage })))
const InventoryPage     = lazy(() => import('../pages/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })))
const SalesPage         = lazy(() => import('../pages/sales/SalesPage').then(m => ({ default: m.SalesPage })))
const ManufacturingPage = lazy(() => import('../pages/manufacturing/ManufacturingPage').then(m => ({ default: m.ManufacturingPage })))
const AdminPage         = lazy(() => import('../pages/admin/AdminPage').then(m => ({ default: m.AdminPage })))

// RequireAuth is a real component so localStorage is read at render time, not
// at router-config build time. Before this fix, the token snapshot was frozen
// when the router module first loaded — meaning a fresh app session would
// permanently route '/' to '/login' even after a successful login until the
// user did a full page reload.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

// Small fallback shown while the lazy chunk loads. Kept minimal so it doesn't
// flash heavy layout. The AppShell adds its own loading shell anyway.
function RouteFallback() {
  return (
    <div className="w-full h-screen flex items-center justify-center text-on-surface-variant text-body-sm">
      Loading…
    </div>
  )
}

const lazyEl = (node: React.ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{node}</Suspense>
)

const authed = (node: React.ReactNode) => <RequireAuth>{node}</RequireAuth>

export const router = createBrowserRouter([
  {
    path: '/login',
    element: lazyEl(<LoginPage />),
  },
  {
    path: '/',
    element: lazyEl(authed(<AppShell><DashboardPage /></AppShell>)),
  },
  {
    path: '/master-data',
    element: lazyEl(authed(<AppShell noPadding><MasterDataPage /></AppShell>)),
  },
  {
    path: '/procurement',
    element: lazyEl(authed(<AppShell noPadding><ProcurementPage /></AppShell>)),
  },
  {
    path: '/inventory',
    element: lazyEl(authed(<AppShell noPadding><InventoryPage /></AppShell>)),
  },
  {
    path: '/sales',
    element: lazyEl(authed(<AppShell noPadding><SalesPage /></AppShell>)),
  },
  // Placeholder routes — pages will be added here as we build them
  {
    path: '/products',
    element: authed(<AppShell><div className="text-on-surface-variant">Products — coming soon</div></AppShell>),
  },
  {
    path: '/contacts',
    element: authed(<AppShell><div className="text-on-surface-variant">Contacts — coming soon</div></AppShell>),
  },
  {
    path: '/manufacturing',
    element: lazyEl(authed(<AppShell noPadding><ManufacturingPage /></AppShell>)),
  },
  {
    path: '/hr',
    element: authed(<AppShell><div className="text-on-surface-variant">HR — coming soon</div></AppShell>),
  },
  {
    path: '/finance',
    element: authed(<AppShell><div className="text-on-surface-variant">Finance — coming soon</div></AppShell>),
  },
  {
    path: '/system',
    element: authed(<AppShell><div className="text-on-surface-variant">System Settings — coming soon</div></AppShell>),
  },
  {
    path: '/admin',
    element: lazyEl(authed(<AppShell noPadding><AdminPage /></AppShell>)),
  },
  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
])
