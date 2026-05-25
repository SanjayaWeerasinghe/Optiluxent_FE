import { KPICard, Badge, Button, Icon } from '../../components/ui'

// ── Static placeholder data (replace with API calls later) ───────────────────
const KPI_DATA = [
  {
    title:     'Active Suppliers',
    value:     '142',
    icon:      'group',
    trend:     '+3 this month',
    trendDir:  'up' as const,
  },
  {
    title:     'Total Products',
    value:     '8,405',
    icon:      'inventory',
    trend:     'Unchanged',
    trendDir:  'flat' as const,
  },
  {
    title:     'Open POs Value (LKR)',
    value:     '45.2M',
    icon:      'request_quote',
    trend:     '-12% vs last week',
    trendDir:  'down' as const,
  },
  {
    title:     'Overdue Payables',
    value:     '1.8M',
    icon:      'warning',
    trend:     'Requires action',
    trendDir:  'flat' as const,
    alert:     true,
  },
]

const AUDIT_ENTRIES = [
  { time: '10:42 AM', action: 'PO-2023-089 Approved',       by: 'K. Perera (Finance)' },
  { time: '09:15 AM', action: 'Stock Adjusted: RM-Steel',    by: 'M. Silva (Inventory)' },
  { time: '08:30 AM', action: 'New Supplier Added',          by: 'A. Fernando (Procurement)' },
  { time: 'Yesterday', action: 'System Backup Complete',     by: 'System Admin' },
]

const PENDING_APPROVALS = [
  { code: 'MR-2023-1042', type: 'Material Request', dept: 'Assembly Line B', date: '24 Oct' },
  { code: 'PR-2023-0089', type: 'Purchase Request', dept: 'Maintenance',      date: '23 Oct' },
  { code: 'PR-2023-0088', type: 'Purchase Request', dept: 'Packaging',        date: '22 Oct' },
]

const STOCK_ALERTS = [
  { product: 'Industrial Lubricant XL-200', warehouse: 'W-01',  qty: 12,  min: 50  },
  { product: 'Steel Rod 12mm',             warehouse: 'W-02',  qty: 5,   min: 100 },
  { product: 'Solvent Grade A',            warehouse: 'W-03',  qty: 30,  min: 80  },
]

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-container-margin max-w-[1400px]">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-headline-md font-headline-md text-on-background">
            Executive Dashboard
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">
            Real-time overview of manufacturing and procurement operations.
          </p>
        </div>
        <Button variant="outline" icon="download" size="sm">
          Export Report
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {KPI_DATA.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </div>

      {/* Middle row — pending approvals + stock alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-container-margin">
        {/* Pending approvals */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
          <div className="px-container-margin py-component-padding-y border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-title-sm font-title-sm text-on-background flex items-center gap-2">
              <Icon name="pending_actions" size={20} className="text-warning" />
              Pending Approvals
            </h3>
            <Badge variant="warning">{PENDING_APPROVALS.length} items</Badge>
          </div>
          <ul className="divide-y divide-outline-variant">
            {PENDING_APPROVALS.map((item) => (
              <li
                key={item.code}
                className="px-container-margin py-component-padding-y flex items-center justify-between hover:bg-surface-container-low transition-colors group"
              >
                <div>
                  <span className="text-label-mono font-label-mono text-primary font-semibold">
                    {item.code}
                  </span>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
                    {item.dept} · {item.date}
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1 rounded text-success hover:bg-success/10 transition-colors"
                    title="Approve"
                  >
                    <Icon name="check_circle" size={18} />
                  </button>
                  <button
                    className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                    title="View"
                  >
                    <Icon name="visibility" size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-container-margin py-component-padding-y border-t border-outline-variant">
            <button className="text-body-sm font-body-sm text-primary hover:underline flex items-center gap-1">
              View all <Icon name="chevron_right" size={16} />
            </button>
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
          <div className="px-container-margin py-component-padding-y border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-title-sm font-title-sm text-on-background flex items-center gap-2">
              <Icon name="inventory_2" size={20} className="text-error" />
              Low Stock Alerts
            </h3>
            <Badge variant="error">{STOCK_ALERTS.length} items</Badge>
          </div>
          <ul className="divide-y divide-outline-variant">
            {STOCK_ALERTS.map((item) => (
              <li
                key={item.product}
                className="px-container-margin py-component-padding-y hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-body-sm font-body-sm text-on-surface font-medium">
                    {item.product}
                  </span>
                  <span className="text-label-mono font-label-mono text-on-surface-variant">
                    {item.warehouse}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full bg-error rounded-full"
                      style={{ width: `${Math.min((item.qty / item.min) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-label-mono font-label-mono text-error whitespace-nowrap">
                    {item.qty} / {item.min} min
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-container-margin py-component-padding-y border-t border-outline-variant">
            <button className="text-body-sm font-body-sm text-primary hover:underline flex items-center gap-1">
              View stock overview <Icon name="chevron_right" size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row — module activity + audit log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-container-margin">
        {/* Module activity placeholder */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm">
          <div className="px-container-margin py-component-padding-y border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-title-sm font-title-sm text-on-background">
              Module Activity
            </h3>
            <span className="text-label-mono font-label-mono text-on-surface-variant">Last 30 days</span>
          </div>
          <div className="p-container-margin flex items-end gap-3 h-52">
            {/* Bar chart placeholder — replace with Recharts/Chart.js */}
            {[
              { label: 'Procurement', pct: 72 },
              { label: 'Inventory',   pct: 55 },
              { label: 'Products',    pct: 28 },
              { label: 'HR',          pct: 18 },
              { label: 'Finance',     pct: 40 },
            ].map((bar) => (
              <div key={bar.label} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-label-mono font-label-mono text-on-surface-variant text-[10px]">
                  {bar.pct}%
                </span>
                <div className="w-full bg-surface-container-high rounded-t-lg overflow-hidden" style={{ height: '120px' }}>
                  <div
                    className="w-full bg-primary/60 rounded-t-lg transition-all"
                    style={{ height: `${bar.pct}%`, marginTop: `${100 - bar.pct}%` }}
                  />
                </div>
                <span className="text-label-mono font-label-mono text-on-surface-variant text-[10px] text-center">
                  {bar.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent audit log */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col">
          <div className="px-container-margin py-component-padding-y border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-title-sm font-title-sm text-on-background">
              Recent Audit Log
            </h3>
            <button className="p-1 rounded text-on-surface-variant hover:bg-surface-container-low transition-colors">
              <Icon name="open_in_new" size={18} />
            </button>
          </div>
          <div className="flex-1 divide-y divide-outline-variant">
            {AUDIT_ENTRIES.map((entry, i) => (
              <div
                key={i}
                className="px-container-margin py-component-padding-y hover:bg-surface-container-low transition-colors"
              >
                <p className="text-body-sm font-body-sm text-on-background">{entry.action}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-label-mono font-label-mono text-on-surface-variant">
                    {entry.by}
                  </span>
                  <span className="text-label-mono font-label-mono text-outline">{entry.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-container-margin py-component-padding-y border-t border-outline-variant">
            <button className="text-body-sm font-body-sm text-primary hover:underline flex items-center gap-1">
              Full audit trail <Icon name="chevron_right" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
