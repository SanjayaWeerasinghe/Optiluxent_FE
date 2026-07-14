import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiGet } from './api'

// Central id → label cache for every entity we render as a foreign key.
//
// The problem this solves: backend list/detail endpoints return raw IDs
// (product_id, warehouse_id, uom_id, ...) with no joined names. Tables and
// line-item panels were showing bare numbers. Rather than change every backend
// response (breaking API contracts across a dozen modules), we cache the
// masters here on first load and let table cells resolve id → label at render.
//
// Loaded eagerly on login. If a row references an ID that isn't in the cache
// yet (freshly created, or a slow load), we render "#<id>" so the user still
// sees something recognisable and can spot stale data.

export type LookupKind =
  | 'product'
  | 'material'
  | 'warehouse'
  | 'uom'
  | 'supplier'
  | 'customer'
  | 'party'         // any party (supplier or customer)
  | 'department'
  | 'workCenter'
  | 'currency'
  | 'paymentTerm'
  | 'taxCode'
  | 'coa'
  | 'bank'
  | 'category'
  | 'materialCategory'
  | 'employee'
  | 'jobPosition'
  | 'bom'
  | 'routing'
  | 'productionPlan'
  | 'productionOrder'
  | 'purchaseOrder'
  | 'salesOrder'
  | 'documentType'
  | 'user'

// Endpoint + label formatter per kind. When a shape needs a different label
// (e.g. banks) add a bespoke entry here and it flows through everything.
const SOURCES: Record<LookupKind, {
  url:      string
  label:    (r: Record<string, unknown>) => string
  filter?:  (r: Record<string, unknown>) => boolean
  // Some endpoints return `{ rows: [...] }` shapes instead of a plain array —
  // extractRows unpacks them.
  extract?: (raw: unknown) => Record<string, unknown>[]
}> = {
  product:          { url: '/api/v1/masterdata/products/',                          label: r => join(r.code, r.name) },
  material:         { url: '/api/v1/masterdata/materials/',                         label: r => join(r.code, r.name) },
  warehouse:        { url: '/api/v1/masterdata/inventory/warehouses',               label: r => join(r.code, r.name) },
  uom:              { url: '/api/v1/masterdata/products/uoms',                      label: r => join(r.code, r.name) },
  party:            { url: '/api/v1/masterdata/contacts/parties',                   label: r => join(r.code, r.name) },
  supplier:         { url: '/api/v1/masterdata/contacts/parties',                   label: r => join(r.code, r.name), filter: r => r.party_type === 'SUPPLIER' || r.party_type === 'BOTH' },
  customer:         { url: '/api/v1/masterdata/contacts/parties',                   label: r => join(r.code, r.name), filter: r => r.party_type === 'CUSTOMER' || r.party_type === 'BOTH' },
  department:       { url: '/api/v1/masterdata/organization/departments',           label: r => join(r.code, r.name) },
  workCenter:       { url: '/api/v1/masterdata/manufacturing/work-centers',         label: r => join(r.code, r.name) },
  currency:         { url: '/api/v1/masterdata/financial/currencies',               label: r => join(r.code, r.name) },
  paymentTerm:      { url: '/api/v1/masterdata/financial/payment-terms',            label: r => join(r.code, r.name) },
  taxCode:          { url: '/api/v1/masterdata/financial/tax-codes',                label: r => join(r.code, r.name) },
  coa:              { url: '/api/v1/masterdata/financial/chart-of-accounts',        label: r => join(r.code, r.name) },
  bank:             { url: '/api/v1/masterdata/financial/banks',                    label: r => r.branch_name ? `${r.name} (${r.branch_name})` : String(r.name ?? r.id) },
  documentType:     { url: '/api/v1/masterdata/document-types',                     label: r => join(r.code, r.name) },
  category:         { url: '/api/v1/masterdata/products/categories',                label: r => join(r.code, r.name) },
  materialCategory: { url: '/api/v1/masterdata/material-categories',                label: r => join(r.code, r.name) },
  employee:         { url: '/api/v1/masterdata/hr/employees',                       label: r => join(r.code, r.name ?? [r.first_name, r.last_name].filter(Boolean).join(' ')) },
  jobPosition:      { url: '/api/v1/masterdata/hr/job-positions',                   label: r => join(r.code, r.name) },
  bom:              { url: '/api/v1/masterdata/manufacturing/boms',                 label: r => String(r.code ?? r.id) },
  routing:          { url: '/api/v1/masterdata/manufacturing/routings',             label: r => String(r.code ?? r.id) },
  productionPlan:   { url: '/api/v1/manufacturing/plans',                           label: r => String(r.code ?? r.id) },
  productionOrder:  { url: '/api/v1/manufacturing/orders',                          label: r => String(r.code ?? r.id) },
  purchaseOrder:    { url: '/api/v1/procurement/purchase-orders',                   label: r => String(r.code ?? r.id) },
  salesOrder:       { url: '/api/v1/sales/sales-orders',                            label: r => String(r.code ?? r.id) },
  user:             {
    url:     '/api/v1/users?limit=200',
    label:   r => {
      const first = String(r.first_name ?? '')
      const last  = String(r.last_name  ?? '')
      const name  = `${first} ${last}`.trim()
      return name || String(r.email ?? r.id)
    },
    // /users returns { users: [...] } rather than a plain array.
    extract: raw => Array.isArray(raw) ? raw : ((raw as { users?: Record<string, unknown>[] })?.users ?? []),
  },
}

function join(...parts: unknown[]): string {
  const s = parts.filter(p => p !== null && p !== undefined && String(p).trim() !== '').map(String)
  if (s.length === 0) return ''
  if (s.length === 1) return s[0]
  return `${s[0]} – ${s.slice(1).join(' ')}`
}

type LookupMap = Map<number, string>
type Store = Partial<Record<LookupKind, LookupMap>>

interface LookupsCtx {
  store: Store
  loading: Set<LookupKind>
  loadKind: (k: LookupKind) => void
  format: (k: LookupKind, id: number | null | undefined) => string
}

const Ctx = createContext<LookupsCtx | null>(null)

// Kinds we prefetch immediately when the provider mounts. Adds ~9 small
// GETs to the initial load, all in parallel — well under a second total.
const EAGER_KINDS: LookupKind[] = [
  'product', 'material', 'warehouse', 'uom',
  'party', 'supplier', 'customer',
  'workCenter', 'department', 'taxCode', 'category',
  'documentType', 'user',
]

export function LookupsProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>({})
  const [loading, setLoading] = useState<Set<LookupKind>>(new Set())

  function loadKind(kind: LookupKind) {
    if (store[kind]) return
    setLoading(prev => {
      if (prev.has(kind)) return prev
      const next = new Set(prev); next.add(kind)
      return next
    })
    const src = SOURCES[kind]
    apiGet<unknown>(src.url)
      .then(raw => {
        const rows = src.extract ? src.extract(raw) : (raw as Record<string, unknown>[] ?? [])
        const map: LookupMap = new Map()
        for (const r of rows) {
          if (src.filter && !src.filter(r)) continue
          const id = Number(r.id)
          if (!Number.isFinite(id)) continue
          map.set(id, src.label(r))
        }
        setStore(prev => ({ ...prev, [kind]: map }))
      })
      .catch(() => setStore(prev => ({ ...prev, [kind]: new Map() })))
      .finally(() => setLoading(prev => {
        if (!prev.has(kind)) return prev
        const next = new Set(prev); next.delete(kind)
        return next
      }))
  }

  useEffect(() => {
    EAGER_KINDS.forEach(loadKind)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function format(kind: LookupKind, id: number | null | undefined): string {
    if (id === null || id === undefined || id === 0) return '—'
    if (!store[kind]) {
      // Kick off the lazy-load outside the render pass — calling setState
      // during render breaks React's rules and produces a warning that also
      // trips CI. This is best-effort: the next render will show the label.
      queueMicrotask(() => loadKind(kind))
      // Fall through to the generic party cache for supplier/customer misses
      // so a doc whose supplier_id points at a party of the "wrong" type still
      // shows a readable name.
      if ((kind === 'supplier' || kind === 'customer') && store.party) {
        return store.party.get(Number(id)) ?? `#${id}`
      }
      return `#${id}`
    }
    const hit = store[kind]!.get(Number(id))
    if (hit) return hit
    // Same fallback for a cache-loaded-but-filtered-out miss.
    if ((kind === 'supplier' || kind === 'customer') && store.party) {
      return store.party.get(Number(id)) ?? `#${id}`
    }
    return `#${id}`
  }

  return (
    <Ctx.Provider value={{ store, loading, loadKind, format }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLookups() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLookups must be used inside <LookupsProvider>')
  return ctx
}

// LookupCell — the single primitive tables use to render an id column.
// Usage in a Column<T>[]:
//   { header: 'Product', key: 'product_id',
//     render: r => <LookupCell kind="product" id={r.product_id as number} /> }
export function LookupCell({ kind, id, fallback = '—' }: { kind: LookupKind; id: number | null | undefined; fallback?: string }) {
  const { format } = useLookups()
  const text = id ? format(kind, id) : fallback
  return <span>{text}</span>
}

// lookupLabel — string-only helper for places that can't render JSX (CSV
// export, tooltips, aria labels).
export function useLookupLabel() {
  const { format } = useLookups()
  return format
}
