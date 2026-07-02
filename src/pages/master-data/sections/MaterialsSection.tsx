import { useState, useEffect, useCallback } from 'react'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Modal } from '../../../components/ui/Modal'
import { Icon } from '../../../components/ui/Icon'
import { apiGet, apiGetPaged, apiPost, apiPut, apiDelete } from '../../../lib/api'
import { Pagination } from '../../../components/ui'
import {
  uomOptions, materialCategoryOptions, supplierOptions, currencyOptions,
} from '../useOptions'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Material {
  id: number
  code: string
  name: string
  material_type: string
  color: string
  category_id: number | null
  category_name?: string
  article_code: string
  ref2: string
  barcode: string
  description: string
  is_active: boolean
  notes: string
}

interface MaterialVendor {
  id?: number
  vendor_id: number | null
  article_no: string
  delivery_days: number
  cost: number | null
  currency_id: number | null
  projected_price: number | null
  moq: number | null
  is_default: boolean
  vendor_name?: string
  currency_code?: string
}

interface MaterialMeasurement {
  id?: number
  base_uom_id: number | null
  target_uom_id: number | null
  conversion_ratio: number
  base_uom_name?: string
  target_uom_name?: string
}

interface MaterialForm {
  id?: number
  code: string
  name: string
  material_type: string
  color: string
  category_id: number | null
  article_code: string
  ref2: string
  barcode: string
  description: string
  is_active: boolean
  notes: string
  // Purchasing sub-table
  purchasing_uom_id: number | null
  under_delivery_pct: number
  over_delivery_pct: number
  // Manufacturing sub-table
  production_uom_id: number | null
  reorder_qty_level: number
  safety_level: number
  production_days: number
  delivery_days: number
  grn_days: number
  procurement_repeat_days: number
  // Warehouse sub-table
  stocking_uom_id: number | null
  stock_removal: string
  storage_main: boolean
  storage_damaged: boolean
  storage_hold: boolean
  batch_process: boolean
  production_date_check: boolean
  expiry_date_check: boolean
  qc_check: boolean
  grn_with_po_uom_image: boolean
  // M:1 sub-tables
  vendors: MaterialVendor[]
  measurements: MaterialMeasurement[]
}

type SelectOpt = { value: string | number; label: string }

interface FormOpts {
  uomOpts:      SelectOpt[]
  catOpts:      SelectOpt[]
  vendorOpts:   SelectOpt[]
  currencyOpts: SelectOpt[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = '/api/v1/masterdata/materials'

const MATERIAL_TABS: TabItem[] = [
  { id: 'RAW_MATERIAL',  label: 'Raw Materials',       icon: 'category' },
  { id: 'SEMI_FINISHED', label: 'Semi-Finished Goods', icon: 'precision_manufacturing' },
  { id: 'SERVICE',       label: 'Services',             icon: 'miscellaneous_services' },
]

const DETAIL_TABS: TabItem[] = [
  { id: 'basic',         label: 'Basic Details' },
  { id: 'purchasing',    label: 'Purchasing' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'vendors',       label: 'Vendors' },
  { id: 'measurements',  label: 'Measurements' },
  { id: 'warehouse',     label: 'Warehouse' },
]

const STOCK_REMOVAL_OPTS: SelectOpt[] = [
  { value: 'FIFO', label: 'FIFO' },
  { value: 'FEFO', label: 'FEFO' },
  { value: 'LIFO', label: 'LIFO' },
]

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL:  'Raw Material',
  SEMI_FINISHED: 'Semi-Finished',
  SERVICE:       'Service',
}

function emptyForm(materialType: string): MaterialForm {
  return {
    code: '', name: '', material_type: materialType, color: '',
    category_id: null, article_code: '', ref2: '', barcode: '', description: '',
    is_active: true, notes: '',
    purchasing_uom_id: null, under_delivery_pct: 0, over_delivery_pct: 0,
    production_uom_id: null, reorder_qty_level: 0, safety_level: 0,
    production_days: 0, delivery_days: 0, grn_days: 0, procurement_repeat_days: 0,
    stocking_uom_id: null, stock_removal: 'FIFO',
    storage_main: false, storage_damaged: false, storage_hold: false,
    batch_process: false, production_date_check: false, expiry_date_check: false,
    qc_check: false, grn_with_po_uom_image: false,
    vendors: [], measurements: [],
  }
}

function emptyVendor(): MaterialVendor {
  return { vendor_id: null, article_no: '', delivery_days: 0, cost: null, currency_id: null, projected_price: null, moq: null, is_default: false }
}

function emptyMeasurement(): MaterialMeasurement {
  return { base_uom_id: null, target_uom_id: null, conversion_ratio: 1 }
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label-mono font-label-mono text-on-surface-variant">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </span>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
          checked ? 'bg-primary' : 'bg-surface-container-high',
        ].join(' ')}
      >
        <span className={[
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')} />
      </button>
      <span className="text-body-sm font-body-sm text-on-surface">{label}</span>
    </label>
  )
}

function StorageCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-primary w-4 h-4" />
      <span className="text-body-sm font-body-sm text-on-surface">{label}</span>
    </label>
  )
}

// ── Tab components (defined at module level to preserve React identity) ───────

interface TabProps {
  form:    MaterialForm
  set:     <K extends keyof MaterialForm>(key: K, value: MaterialForm[K]) => void
  isEdit:  boolean
  opts:    FormOpts
  onAddVendor:         () => void
  onUpdateVendor:      (i: number, key: keyof MaterialVendor, value: unknown) => void
  onRemoveVendor:      (i: number) => void
  onAddMeasurement:    () => void
  onUpdateMeasurement: (i: number, key: keyof MaterialMeasurement, value: unknown) => void
  onRemoveMeasurement: (i: number) => void
}

function BasicTab({ form, set, isEdit, opts }: TabProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Code" required>
        <Input value={form.code} onChange={e => set('code', e.target.value)} placeholder="RM-RU-0001" disabled={isEdit} />
      </Field>
      <Field label="Name" required>
        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Material name" />
      </Field>
      <Field label="Material Type" required>
        <Select
          value={form.material_type}
          onChange={e => set('material_type', e.target.value)}
          options={[
            { value: 'RAW_MATERIAL',  label: 'Raw Material' },
            { value: 'SEMI_FINISHED', label: 'Semi-Finished' },
            { value: 'SERVICE',       label: 'Service' },
          ]}
        />
      </Field>
      <Field label="Color">
        <Input value={form.color} onChange={e => set('color', e.target.value)} placeholder="WHITE & GRAY" />
      </Field>
      <Field label="Category">
        <Select
          value={form.category_id ?? ''}
          onChange={e => set('category_id', e.target.value ? Number(e.target.value) : null)}
          options={opts.catOpts}
          placeholder="Select category"
        />
      </Field>
      <Field label="Article Code (Ref #1)">
        <Input value={form.article_code} onChange={e => set('article_code', e.target.value)} placeholder="Enter Article Code" />
      </Field>
      <Field label="Ref #2">
        <Input value={form.ref2} onChange={e => set('ref2', e.target.value)} placeholder="Enter reference #2" />
      </Field>
      <Field label="Barcode">
        <Input value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="Enter barcode" />
      </Field>
      <div className="col-span-2">
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Enter description"
            rows={3}
            className="w-full px-3 py-2 rounded border border-outline-variant bg-surface-container-lowest text-body-md font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
          />
        </Field>
      </div>
      {isEdit && (
        <Field label="Active">
          <Toggle label="Active" checked={form.is_active} onChange={v => set('is_active', v)} />
        </Field>
      )}
    </div>
  )
}

function PurchasingTab({ form, set, opts }: TabProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Field label="Purchasing UOM">
        <Select
          value={form.purchasing_uom_id ?? ''}
          onChange={e => set('purchasing_uom_id', e.target.value ? Number(e.target.value) : null)}
          options={opts.uomOpts}
          placeholder="Select UOM"
        />
      </Field>
      <Field label="Under Delivery %">
        <Input type="number" min={0} value={form.under_delivery_pct} onChange={e => set('under_delivery_pct', Number(e.target.value))} />
      </Field>
      <Field label="Over Delivery %">
        <Input type="number" min={0} value={form.over_delivery_pct} onChange={e => set('over_delivery_pct', Number(e.target.value))} />
      </Field>
    </div>
  )
}

function ManufacturingTab({ form, set, opts }: TabProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Field label="Production UOM">
        <Select
          value={form.production_uom_id ?? ''}
          onChange={e => set('production_uom_id', e.target.value ? Number(e.target.value) : null)}
          options={opts.uomOpts}
          placeholder="Select UOM"
        />
      </Field>
      <Field label="Reorder Qty Level">
        <Input type="number" min={0} value={form.reorder_qty_level} onChange={e => set('reorder_qty_level', Number(e.target.value))} />
      </Field>
      <Field label="Safety Level">
        <Input type="number" min={0} value={form.safety_level} onChange={e => set('safety_level', Number(e.target.value))} />
      </Field>
      <Field label="Production Days">
        <Input type="number" min={0} value={form.production_days} onChange={e => set('production_days', Number(e.target.value))} />
      </Field>
      <Field label="Delivery Days">
        <Input type="number" min={0} value={form.delivery_days} onChange={e => set('delivery_days', Number(e.target.value))} />
      </Field>
      <Field label="Goods Receiving Days">
        <Input type="number" min={0} value={form.grn_days} onChange={e => set('grn_days', Number(e.target.value))} />
      </Field>
      <Field label="Procurement Repeat Days">
        <Input type="number" min={0} value={form.procurement_repeat_days} onChange={e => set('procurement_repeat_days', Number(e.target.value))} />
      </Field>
    </div>
  )
}

function VendorsTab({ form, opts, onAddVendor, onUpdateVendor, onRemoveVendor }: TabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-body-sm font-semibold text-on-surface">Purchasing Vendor Details</h3>
        <Button variant="text" size="sm" onClick={onAddVendor}>
          <Icon name="add" size={16} /> Add Vendor
        </Button>
      </div>
      <div className="border border-outline-variant rounded overflow-hidden">
        <table className="w-full text-body-sm font-body-sm">
          <thead className="bg-surface-container text-on-surface-variant">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Vendor</th>
              <th className="text-left px-3 py-2 font-medium">Article No</th>
              <th className="text-left px-3 py-2 font-medium w-20">Del. Days</th>
              <th className="text-left px-3 py-2 font-medium w-24">Cost</th>
              <th className="text-left px-3 py-2 font-medium w-28">Currency</th>
              <th className="text-left px-3 py-2 font-medium w-28">Proj. Price</th>
              <th className="text-left px-3 py-2 font-medium w-24">MOQ</th>
              <th className="text-center px-3 py-2 font-medium w-16">Default</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {form.vendors.length === 0 && (
              <tr><td colSpan={9} className="text-center py-4 text-on-surface-variant">No vendors added</td></tr>
            )}
            {form.vendors.map((v, i) => (
              <tr key={i} className="border-t border-outline-variant">
                <td className="px-2 py-1">
                  <Select value={v.vendor_id ?? ''} onChange={e => onUpdateVendor(i, 'vendor_id', e.target.value ? Number(e.target.value) : null)} options={opts.vendorOpts} placeholder="Select" />
                </td>
                <td className="px-2 py-1">
                  <Input value={v.article_no} onChange={e => onUpdateVendor(i, 'article_no', e.target.value)} placeholder="Article no" />
                </td>
                <td className="px-2 py-1">
                  <Input type="number" min={0} value={v.delivery_days} onChange={e => onUpdateVendor(i, 'delivery_days', Number(e.target.value))} />
                </td>
                <td className="px-2 py-1">
                  <Input type="number" min={0} value={v.cost ?? ''} onChange={e => onUpdateVendor(i, 'cost', e.target.value ? Number(e.target.value) : null)} placeholder="0" />
                </td>
                <td className="px-2 py-1">
                  <Select value={v.currency_id ?? ''} onChange={e => onUpdateVendor(i, 'currency_id', e.target.value ? Number(e.target.value) : null)} options={opts.currencyOpts} placeholder="Select" />
                </td>
                <td className="px-2 py-1">
                  <Input type="number" min={0} value={v.projected_price ?? ''} onChange={e => onUpdateVendor(i, 'projected_price', e.target.value ? Number(e.target.value) : null)} placeholder="0" />
                </td>
                <td className="px-2 py-1">
                  <Input type="number" min={0} value={v.moq ?? ''} onChange={e => onUpdateVendor(i, 'moq', e.target.value ? Number(e.target.value) : null)} placeholder="0" />
                </td>
                <td className="px-2 py-1 text-center">
                  <input type="checkbox" checked={v.is_default} onChange={e => onUpdateVendor(i, 'is_default', e.target.checked)} className="accent-primary" />
                </td>
                <td className="px-1 py-1">
                  <button onClick={() => onRemoveVendor(i)} className="text-error hover:text-error/70 p-1">
                    <Icon name="close" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MeasurementsTab({ form, opts, onAddMeasurement, onUpdateMeasurement, onRemoveMeasurement }: TabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-body-sm font-body-sm text-on-surface-variant">BaseUoM = ExchangeRate × TargetUoM</p>
        <Button variant="text" size="sm" onClick={onAddMeasurement}>
          <Icon name="add" size={16} /> Add Row
        </Button>
      </div>
      <div className="border border-outline-variant rounded overflow-hidden">
        <table className="w-full text-body-sm font-body-sm">
          <thead className="bg-surface-container text-on-surface-variant">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Base UOM</th>
              <th className="text-left px-3 py-2 font-medium">Target UOM</th>
              <th className="text-left px-3 py-2 font-medium w-36">Conversion Ratio</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {form.measurements.length === 0 && (
              <tr><td colSpan={4} className="text-center py-4 text-on-surface-variant">No conversions defined</td></tr>
            )}
            {form.measurements.map((m, i) => (
              <tr key={i} className="border-t border-outline-variant">
                <td className="px-2 py-1">
                  <Select value={m.base_uom_id ?? ''} onChange={e => onUpdateMeasurement(i, 'base_uom_id', e.target.value ? Number(e.target.value) : null)} options={opts.uomOpts} placeholder="Select" />
                </td>
                <td className="px-2 py-1">
                  <Select value={m.target_uom_id ?? ''} onChange={e => onUpdateMeasurement(i, 'target_uom_id', e.target.value ? Number(e.target.value) : null)} options={opts.uomOpts} placeholder="Select" />
                </td>
                <td className="px-2 py-1">
                  <Input type="number" min={0} step={0.000001} value={m.conversion_ratio} onChange={e => onUpdateMeasurement(i, 'conversion_ratio', Number(e.target.value))} />
                </td>
                <td className="px-1 py-1">
                  <button onClick={() => onRemoveMeasurement(i)} className="text-error hover:text-error/70 p-1">
                    <Icon name="close" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WarehouseTab({ form, set, opts }: TabProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Field label="Stocking UOM">
          <Select
            value={form.stocking_uom_id ?? ''}
            onChange={e => set('stocking_uom_id', e.target.value ? Number(e.target.value) : null)}
            options={opts.uomOpts}
            placeholder="Select UOM"
          />
        </Field>
        <Field label="Stock Removal">
          <Select
            value={form.stock_removal}
            onChange={e => set('stock_removal', e.target.value)}
            options={STOCK_REMOVAL_OPTS}
          />
        </Field>
      </div>

      <div>
        <p className="text-label-mono font-label-mono text-on-surface-variant mb-2">Internal Storage</p>
        <div className="flex gap-6">
          <StorageCheckbox label="Main"    checked={form.storage_main}    onChange={v => set('storage_main',    v)} />
          <StorageCheckbox label="Damaged" checked={form.storage_damaged} onChange={v => set('storage_damaged', v)} />
          <StorageCheckbox label="Hold"    checked={form.storage_hold}    onChange={v => set('storage_hold',    v)} />
        </div>
      </div>

      <div>
        <p className="text-label-mono font-label-mono text-on-surface-variant mb-2">Additional Controls</p>
        <div className="grid grid-cols-2 gap-3">
          <Toggle label="Restricted to Batch Process"          checked={form.batch_process}         onChange={v => set('batch_process',         v)} />
          <Toggle label="Production Date Check"                 checked={form.production_date_check} onChange={v => set('production_date_check', v)} />
          <Toggle label="Expiry Date Check"                     checked={form.expiry_date_check}     onChange={v => set('expiry_date_check',     v)} />
          <Toggle label="Quality Control Check"                 checked={form.qc_check}              onChange={v => set('qc_check',              v)} />
          <Toggle label="GRN with Purchase Order UoM and Image" checked={form.grn_with_po_uom_image} onChange={v => set('grn_with_po_uom_image', v)} />
        </div>
      </div>
    </div>
  )
}

// ── API response wrappers ─────────────────────────────────────────────────────

interface ApiResponse<T> { data: T }

// ── Main component ────────────────────────────────────────────────────────────

export function MaterialsSection() {
  const [matType,      setMatType]      = useState('RAW_MATERIAL')
  const [list,         setList]         = useState<Material[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [perPage,      setPerPage]      = useState(20)
  const [total,        setTotal]        = useState(0)
  const [modal,        setModal]        = useState<'create' | 'edit' | 'delete' | null>(null)
  const [form,         setFormState]    = useState<MaterialForm>(emptyForm('RAW_MATERIAL'))
  const [detailTab,    setDetailTab]    = useState('basic')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null)

  const [opts, setOpts] = useState<FormOpts>({ uomOpts: [], catOpts: [], vendorOpts: [], currencyOpts: [] })

  useEffect(() => {
    Promise.all([
      uomOptions()(),
      materialCategoryOptions()(),
      supplierOptions()(),
      currencyOptions()(),
    ]).then(([uomOpts, catOpts, vendorOpts, currencyOpts]) => {
      setOpts({ uomOpts, catOpts, vendorOpts, currencyOpts })
    }).catch(() => {})
  }, [])

  const load = useCallback((p: number, pp: number) => {
    setLoading(true)
    apiGetPaged<Material>(`${BASE}?material_type=${matType}&page=${p}&per_page=${pp}`)
      .then(({ data: rows, meta }) => {
        setList(Array.isArray(rows) ? rows : [])
        setTotal(meta.total)
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [matType])

  useEffect(() => { setPage(1); load(1, perPage) }, [matType]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(page, perPage) }, [page, perPage, load]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search
    ? list.filter(r => `${r.code} ${r.name}`.toLowerCase().includes(search.toLowerCase()))
    : list

  function openCreate() {
    setFormState(emptyForm(matType))
    setDetailTab('basic')
    setError('')
    setModal('create')
  }

  async function openEdit(id: number) {
    setError('')
    setDetailTab('basic')
    try {
      const [coreRes, purRes, mfgRes, whRes, vendRes, measRes] = await Promise.all([
        apiGet<ApiResponse<Material>>(`${BASE}/${id}`),
        apiGet<ApiResponse<Record<string, unknown>>>(`${BASE}/${id}/purchasing`).catch(() => ({ data: {} })),
        apiGet<ApiResponse<Record<string, unknown>>>(`${BASE}/${id}/manufacturing`).catch(() => ({ data: {} })),
        apiGet<ApiResponse<Record<string, unknown>>>(`${BASE}/${id}/warehouse`).catch(() => ({ data: {} })),
        apiGet<ApiResponse<MaterialVendor[]>>(`${BASE}/${id}/vendors`).catch(() => ({ data: [] })),
        apiGet<ApiResponse<MaterialMeasurement[]>>(`${BASE}/${id}/measurements`).catch(() => ({ data: [] })),
      ])
      const core = coreRes.data ?? coreRes as unknown as Material
      const pur  = purRes.data  ?? purRes  as unknown as Record<string, unknown>
      const mfg  = mfgRes.data  ?? mfgRes  as unknown as Record<string, unknown>
      const wh   = whRes.data   ?? whRes   as unknown as Record<string, unknown>
      const vend = vendRes.data  ?? (Array.isArray(vendRes) ? vendRes as unknown as MaterialVendor[] : [])
      const meas = measRes.data  ?? (Array.isArray(measRes) ? measRes as unknown as MaterialMeasurement[] : [])

      setFormState({
        id:           (core as Material).id,
        code:         (core as Material).code         ?? '',
        name:         (core as Material).name         ?? '',
        material_type:(core as Material).material_type ?? matType,
        color:        (core as Material).color        ?? '',
        category_id:  (core as Material).category_id  ?? null,
        article_code: (core as Material).article_code ?? '',
        ref2:         (core as Material).ref2         ?? '',
        barcode:      (core as Material).barcode      ?? '',
        description:  (core as Material).description  ?? '',
        is_active:    (core as Material).is_active    ?? true,
        notes:        (core as Material).notes        ?? '',
        purchasing_uom_id:  (pur.purchasing_uom_id  as number)  ?? null,
        under_delivery_pct: (pur.under_delivery_pct as number)  ?? 0,
        over_delivery_pct:  (pur.over_delivery_pct  as number)  ?? 0,
        production_uom_id:      (mfg.production_uom_id      as number) ?? null,
        reorder_qty_level:      (mfg.reorder_qty_level      as number) ?? 0,
        safety_level:           (mfg.safety_level           as number) ?? 0,
        production_days:        (mfg.production_days        as number) ?? 0,
        delivery_days:          (mfg.delivery_days          as number) ?? 0,
        grn_days:               (mfg.grn_days               as number) ?? 0,
        procurement_repeat_days:(mfg.procurement_repeat_days as number) ?? 0,
        stocking_uom_id:       (wh.stocking_uom_id        as number)  ?? null,
        stock_removal:         (wh.stock_removal           as string)  ?? 'FIFO',
        storage_main:          (wh.storage_main            as boolean) ?? false,
        storage_damaged:       (wh.storage_damaged         as boolean) ?? false,
        storage_hold:          (wh.storage_hold            as boolean) ?? false,
        batch_process:         (wh.batch_process           as boolean) ?? false,
        production_date_check: (wh.production_date_check   as boolean) ?? false,
        expiry_date_check:     (wh.expiry_date_check       as boolean) ?? false,
        qc_check:              (wh.qc_check                as boolean) ?? false,
        grn_with_po_uom_image: (wh.grn_with_po_uom_image  as boolean) ?? false,
        vendors:      Array.isArray(vend) ? vend as MaterialVendor[] : [],
        measurements: Array.isArray(meas) ? meas as MaterialMeasurement[] : [],
      })
      setModal('edit')
    } catch {
      setError('Failed to load material')
    }
  }

  function openDelete(m: Material) {
    setDeleteTarget(m)
    setError('')
    setModal('delete')
  }

  const set = useCallback(<K extends keyof MaterialForm>(key: K, value: MaterialForm[K]) => {
    setFormState(f => ({ ...f, [key]: value }))
  }, [])

  const onAddVendor = useCallback(() => {
    setFormState(f => ({ ...f, vendors: [...f.vendors, emptyVendor()] }))
  }, [])

  const onUpdateVendor = useCallback((idx: number, key: keyof MaterialVendor, value: unknown) => {
    setFormState(f => {
      const vendors = [...f.vendors]
      vendors[idx] = { ...vendors[idx], [key]: value }
      return { ...f, vendors }
    })
  }, [])

  const onRemoveVendor = useCallback((idx: number) => {
    setFormState(f => ({ ...f, vendors: f.vendors.filter((_, i) => i !== idx) }))
  }, [])

  const onAddMeasurement = useCallback(() => {
    setFormState(f => ({ ...f, measurements: [...f.measurements, emptyMeasurement()] }))
  }, [])

  const onUpdateMeasurement = useCallback((idx: number, key: keyof MaterialMeasurement, value: unknown) => {
    setFormState(f => {
      const measurements = [...f.measurements]
      measurements[idx] = { ...measurements[idx], [key]: value }
      return { ...f, measurements }
    })
  }, [])

  const onRemoveMeasurement = useCallback((idx: number) => {
    setFormState(f => ({ ...f, measurements: f.measurements.filter((_, i) => i !== idx) }))
  }, [])

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Code and Name are required')
      setDetailTab('basic')
      return
    }
    setSaving(true)
    setError('')
    try {
      let id: number

      if (modal === 'create') {
        const res = await apiPost<ApiResponse<{ id: number }>>(BASE, {
          code: form.code, name: form.name, material_type: form.material_type,
          color: form.color, category_id: form.category_id, article_code: form.article_code,
          ref2: form.ref2, barcode: form.barcode, description: form.description, notes: form.notes,
        })
        id = (res.data ?? res as unknown as { id: number }).id
      } else {
        id = form.id!
        await apiPut(`${BASE}/${id}`, {
          name: form.name, material_type: form.material_type, color: form.color,
          category_id: form.category_id, article_code: form.article_code, ref2: form.ref2,
          barcode: form.barcode, description: form.description, is_active: form.is_active, notes: form.notes,
        })
      }

      await Promise.all([
        apiPut(`${BASE}/${id}/purchasing`, {
          purchasing_uom_id: form.purchasing_uom_id,
          under_delivery_pct: form.under_delivery_pct,
          over_delivery_pct: form.over_delivery_pct,
        }),
        apiPut(`${BASE}/${id}/manufacturing`, {
          production_uom_id: form.production_uom_id,
          reorder_qty_level: form.reorder_qty_level,
          safety_level: form.safety_level,
          production_days: form.production_days,
          delivery_days: form.delivery_days,
          grn_days: form.grn_days,
          procurement_repeat_days: form.procurement_repeat_days,
        }),
        apiPut(`${BASE}/${id}/warehouse`, {
          stocking_uom_id: form.stocking_uom_id,
          stock_removal: form.stock_removal,
          storage_main: form.storage_main,
          storage_damaged: form.storage_damaged,
          storage_hold: form.storage_hold,
          batch_process: form.batch_process,
          production_date_check: form.production_date_check,
          expiry_date_check: form.expiry_date_check,
          qc_check: form.qc_check,
          grn_with_po_uom_image: form.grn_with_po_uom_image,
        }),
        apiPost(`${BASE}/${id}/vendors/replace`, form.vendors),
        apiPost(`${BASE}/${id}/measurements/replace`, form.measurements),
      ])

      setModal(null)
      load(page, perPage)
    } catch (e) {
      setError((e as Error).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await apiDelete(`${BASE}/${deleteTarget.id}`)
      setModal(null)
      load(page, perPage)
    } catch (e) {
      setError((e as Error).message ?? 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const tabProps: TabProps = {
    form, set, isEdit: modal === 'edit', opts,
    onAddVendor, onUpdateVendor, onRemoveVendor,
    onAddMeasurement, onUpdateMeasurement, onRemoveMeasurement,
  }

  const modalTitle = modal === 'create'
    ? `New ${MATERIAL_TYPE_LABELS[matType] ?? 'Material'}`
    : form.code ?? 'Edit Material'

  return (
    <div className="space-y-4">
      <Tabs tabs={MATERIAL_TABS} active={matType} onChange={t => { setMatType(t); setSearch('') }} size="sm" />

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="relative w-64">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search code or name…"
            className="w-full pl-8 pr-3 py-1.5 rounded border border-outline-variant bg-surface-container-lowest text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
        <Button onClick={openCreate} size="sm">
          <Icon name="add" size={16} /> Add {MATERIAL_TYPE_LABELS[matType]}
        </Button>
      </div>

      <div className="border border-outline-variant rounded-lg overflow-hidden">
        <table className="w-full text-body-sm font-body-sm">
          <thead className="bg-surface-container text-on-surface-variant border-b border-outline-variant">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium w-32">Code</th>
              <th className="text-left px-4 py-2.5 font-medium">Name</th>
              <th className="text-left px-4 py-2.5 font-medium w-36">Category</th>
              <th className="text-left px-4 py-2.5 font-medium w-24">Color</th>
              <th className="text-left px-4 py-2.5 font-medium w-20">Status</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center py-8 text-on-surface-variant">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-on-surface-variant">No records found</td></tr>
            )}
            {filtered.map(m => (
              <tr key={m.id} className="border-t border-outline-variant hover:bg-surface-container-low transition-colors">
                <td className="px-4 py-2.5 font-mono text-label-mono">{m.code}</td>
                <td className="px-4 py-2.5">{m.name}</td>
                <td className="px-4 py-2.5 text-on-surface-variant">{m.category_name ?? '—'}</td>
                <td className="px-4 py-2.5 text-on-surface-variant">{m.color || '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={[
                    'inline-flex items-center px-2 py-0.5 rounded text-label-mono font-label-mono',
                    m.is_active ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container text-on-surface-variant',
                  ].join(' ')}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(m.id)} className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors">
                      <Icon name="edit" size={16} />
                    </button>
                    <button onClick={() => openDelete(m)} className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-error transition-colors">
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        perPage={perPage}
        total={search ? filtered.length : total}
        onPage={p => setPage(p)}
        onPerPage={pp => { setPerPage(pp); setPage(1) }}
      />

      <Modal
        isOpen={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modalTitle}
        size="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <p className="text-label-mono text-error">{error}</p>
            <div className="flex gap-2">
              <Button variant="outlined" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Tabs tabs={DETAIL_TABS} active={detailTab} onChange={setDetailTab} size="sm" />
          <div className="pt-1 min-h-[320px]">
            {detailTab === 'basic'         && <BasicTab         {...tabProps} />}
            {detailTab === 'purchasing'    && <PurchasingTab    {...tabProps} />}
            {detailTab === 'manufacturing' && <ManufacturingTab {...tabProps} />}
            {detailTab === 'vendors'       && <VendorsTab       {...tabProps} />}
            {detailTab === 'measurements'  && <MeasurementsTab  {...tabProps} />}
            {detailTab === 'warehouse'     && <WarehouseTab     {...tabProps} />}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal === 'delete'}
        onClose={() => setModal(null)}
        title="Delete Material"
        size="sm"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outlined" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
            <Button variant="filled" onClick={handleDelete} disabled={saving} className="bg-error text-on-error hover:bg-error/90">
              {saving ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        }
      >
        <p className="text-body-md font-body-md text-on-surface">
          Delete <strong>{deleteTarget?.code} — {deleteTarget?.name}</strong>? This cannot be undone.
        </p>
        {error && <p className="text-label-mono text-error mt-2">{error}</p>}
      </Modal>
    </div>
  )
}
