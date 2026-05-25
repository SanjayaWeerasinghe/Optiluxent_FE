import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell }          from '../components/layout'
import { LoginPage }         from '../pages/auth/LoginPage'
import { DashboardPage }     from '../pages/dashboard/DashboardPage'
import { MasterDataPage }    from '../pages/master-data/MasterDataPage'
import { ProcurementPage }  from '../pages/procurement/ProcurementPage'
import { InventoryPage }    from '../pages/inventory/InventoryPage'
import { SalesPage }           from '../pages/sales/SalesPage'
import { ManufacturingPage }   from '../pages/manufacturing/ManufacturingPage'

function requireAuth(element: React.ReactNode) {
  const token = localStorage.getItem('access_token')
  return token ? element : <Navigate to="/login" replace />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: requireAuth(<AppShell><DashboardPage /></AppShell>),
  },
  {
    path: '/master-data',
    element: requireAuth(<AppShell noPadding><MasterDataPage /></AppShell>),
  },
  {
    path: '/procurement',
    element: requireAuth(<AppShell noPadding><ProcurementPage /></AppShell>),
  },
  {
    path: '/inventory',
    element: requireAuth(<AppShell noPadding><InventoryPage /></AppShell>),
  },
  {
    path: '/sales',
    element: requireAuth(<AppShell noPadding><SalesPage /></AppShell>),
  },
  // Placeholder routes — pages will be added here as we build them
  {
    path: '/products',
    element: requireAuth(<AppShell><div className="text-on-surface-variant">Products — coming soon</div></AppShell>),
  },
  {
    path: '/contacts',
    element: requireAuth(<AppShell><div className="text-on-surface-variant">Contacts — coming soon</div></AppShell>),
  },
  {
    path: '/manufacturing',
    element: requireAuth(<AppShell noPadding><ManufacturingPage /></AppShell>),
  },
  {
    path: '/hr',
    element: requireAuth(<AppShell><div className="text-on-surface-variant">HR — coming soon</div></AppShell>),
  },
  {
    path: '/finance',
    element: requireAuth(<AppShell><div className="text-on-surface-variant">Finance — coming soon</div></AppShell>),
  },
  {
    path: '/system',
    element: requireAuth(<AppShell><div className="text-on-surface-variant">System Settings — coming soon</div></AppShell>),
  },
  {
    path: '/admin',
    element: requireAuth(<AppShell><div className="text-on-surface-variant">Admin — coming soon</div></AppShell>),
  },
  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
])
