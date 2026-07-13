import { useState, useEffect, useMemo } from 'react'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { Button, Input, Badge } from '../../../components/ui'
import { Table, type Column } from '../../../components/ui/Table'
import { Modal } from '../../../components/ui/Modal'
import { Icon } from '../../../components/ui/Icon'
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/api'

const BASE = '/api/v1/masterdata/document-types'

// The doc models a Type can attach to. Order matches the sidebar / workflow.
const MODELS: TabItem[] = [
  { id: 'PR',  label: 'Purchase Requests',   icon: 'receipt_long' },
  { id: 'PO',  label: 'Purchase Orders',     icon: 'shopping_cart' },
  { id: 'GRN', label: 'Goods Receipts',      icon: 'move_to_inbox' },
  { id: 'PI',  label: 'Purchase Invoices',   icon: 'request_quote' },
  { id: 'MR',  label: 'Material Requests',   icon: 'assignment' },
  { id: 'GT',  label: 'Goods Transfers',     icon: 'swap_horiz' },
  { id: 'GI',  label: 'Goods Issues',        icon: 'output' },
  { id: 'SA',  label: 'Stock Adjustments',   icon: 'tune' },
  { id: 'QC',  label: 'Quality Checks',      icon: 'verified' },
  { id: 'SQ',  label: 'Sales Quotations',    icon: 'request_quote' },
  { id: 'SO',  label: 'Sales Orders',        icon: 'shopping_bag' },
  { id: 'DO',  label: 'Deliveries',          icon: 'local_shipping' },
  { id: 'SI',  label: 'Sales Invoices',      icon: 'receipt' },
]

// Field kinds available for a picker slot. Each maps to an existing entity
// list — see lookups.tsx / useOptions.ts for the actual loaders.
const FIELD_KINDS: Array<{ value: string; label: string }> = [
  { value: 'PR',        label: 'Purchase Request' },
  { value: 'PO',        label: 'Purchase Order'   },
  { value: 'GRN',       label: 'Goods Receipt'    },
  { value: 'PI',        label: 'Purchase Invoice' },
  { value: 'MR',        label: 'Material Request' },
  { value: 'GT',        label: 'Goods Transfer'   },
  { value: 'GI',        label: 'Goods Issue'      },
  { value: 'SA',        label: 'Stock Adjustment' },
  { value: 'QC',        label: 'Quality Check'    },
  { value: 'SQ',        label: 'Sales Quotation'  },
  { value: 'SO',        label: 'Sales Order'      },
  { value: 'DO',        label: 'Delivery Order'   },
  { value: 'SI',         label: 'Sales Invoice'         },
  { value: 'MO',         label: 'Manufacturing Order'   },
  { value: 'Customer',   label: 'Customer'              },
  { value: 'Supplier',   label: 'Supplier'              },
  { value: 'Product',    label: 'Product'               },
  { value: 'Warehouse',  label: 'Warehouse'             },
  { value: 'Department', label: 'Department'            },
]

interface DocType {
  id:         number
  model:      string
  code:       string
  name:       string
  system_key: string | null
  is_active:  boolean
  fields?:    Field[]
}

interface Field {
  id:            number
  document_type_id: number
  code:          string
  label:         string
  kind:          string
  is_required:   boolean
  display_order: number
}

// ── Section body ─────────────────────────────────────────────────────────────

export function DocumentTypesSection() {
  const [model, setModel] = useState('GRN')

  return (
    <div className="space-y-4">
      <Tabs tabs={MODELS} active={model} onChange={setModel} size="sm" />
      <div className="pt-2">
        <TypesList model={model} />
      </div>
    </div>
  )
}

// ── Per-model list + create ──────────────────────────────────────────────────

function TypesList({ model }: { model: string }) {
  const [rows, setRows] = useState<DocType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<DocType | null>(null)

  function load() {
    setLoading(true)
    apiGet<DocType[]>(`${BASE}?model=${model}`)
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [model]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter(r =>
      r.code.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      (r.system_key ?? '').toLowerCase().includes(q)
    )
  }, [rows, search])

  const COLS: Column<Record<string, unknown>>[] = [
    { header: 'Code', key: 'code',       width: '160px' },
    { header: 'Name', key: 'name' },
    { header: 'System Key', key: 'system_key', width: '160px',
      render: r => r.system_key ? <Badge variant="primary">{String(r.system_key)}</Badge> : <span className="text-on-surface-variant">—</span> },
    { header: 'Active', key: 'is_active', width: '80px',
      render: r => r.is_active ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge> },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 max-w-sm">
          <Input placeholder="Search Types…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="primary" size="sm" icon="add" onClick={() => setCreating(true)}>New Type</Button>
      </div>

      <Table
        columns={COLS}
        data={filtered as unknown as Record<string, unknown>[]}
        loading={loading}
        onRowClick={r => setEditing(r as unknown as DocType)}
        empty={`No ${model} Types yet — click "New Type" to add one.`}
      />

      {(creating || editing) && (
        <TypeModal
          model={model}
          doc={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

// ── Type detail modal — header + inline field editor ─────────────────────────

interface TypeModalProps {
  model:    string
  doc:      DocType | null
  onClose:  () => void
  onSaved:  () => void
}

function TypeModal({ model, doc, onClose, onSaved }: TypeModalProps) {
  const isNew = doc === null
  const [code, setCode] = useState(doc?.code ?? '')
  const [name, setName] = useState(doc?.name ?? '')
  const [isActive, setIsActive] = useState(doc?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [fields, setFields] = useState<Field[]>([])
  const [fieldsLoading, setFieldsLoading] = useState(false)

  const [newField, setNewField] = useState<Partial<Field>>({ code: '', label: '', kind: 'Customer', is_required: false, display_order: 0 })
  const [showNewField, setShowNewField] = useState(false)

  useEffect(() => {
    if (isNew || !doc) return
    setFieldsLoading(true)
    apiGet<Field[]>(`${BASE}/${doc.id}/fields`)
      .then(d => setFields(Array.isArray(d) ? d : []))
      .catch(() => setFields([]))
      .finally(() => setFieldsLoading(false))
  }, [isNew, doc])

  async function handleSaveHeader() {
    setError(''); setSaving(true)
    try {
      if (isNew) {
        const created = await apiPost<DocType>(BASE, { model, code, name, is_active: isActive })
        // Reopen as "edit" so the fields section shows up. Simpler UX: just reload the parent.
        onSaved()
        return created
      } else {
        await apiPut(`${BASE}/${doc!.id}`, { code, name, is_active: isActive })
        onSaved()
      }
    } catch (e) {
      setError((e as Error).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteType() {
    if (isNew || !doc) return
    if (!confirm(`Delete Type "${doc.code}"? Documents currently using it will lose their classification.`)) return
    setSaving(true)
    try {
      await apiDelete(`${BASE}/${doc.id}`)
      onSaved()
    } catch (e) {
      setError((e as Error).message ?? 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  async function addField() {
    if (!doc) return
    try {
      const created = await apiPost<Field>(`${BASE}/${doc.id}/fields`, newField)
      setFields(prev => [...prev, created])
      setNewField({ code: '', label: '', kind: 'Customer', is_required: false, display_order: 0 })
      setShowNewField(false)
    } catch (e) {
      setError((e as Error).message ?? 'Add field failed')
    }
  }

  async function removeField(id: number) {
    if (!doc) return
    if (!confirm('Remove this field?')) return
    try {
      await apiDelete(`${BASE}/${doc.id}/fields/${id}`)
      setFields(prev => prev.filter(f => f.id !== id))
    } catch (e) {
      setError((e as Error).message ?? 'Remove field failed')
    }
  }

  const isSystem = doc?.system_key !== null && doc?.system_key !== undefined

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isNew ? `New ${model} Type` : `${model} Type — ${doc?.code}`}
      size="xl"
      footer={
        <div className="flex items-center gap-2 flex-wrap">
          {error && <span className="text-label-mono font-label-mono text-error flex items-center gap-1 mr-auto"><Icon name="error" size={14} /> {error}</span>}
          {!isNew && !isSystem && (
            <Button variant="danger" size="sm" icon="delete" onClick={handleDeleteType} disabled={saving}>Delete</Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Close</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSaveHeader}>
            {isNew ? 'Create' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-label-mono font-label-mono uppercase text-on-surface-variant">Code</label>
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="IMPORT_RETURN" disabled={isSystem} />
            {isSystem && <p className="text-body-sm text-on-surface-variant mt-1">System type — code is fixed.</p>}
          </div>
          <div>
            <label className="text-label-mono font-label-mono uppercase text-on-surface-variant">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Import Return" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="dt-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <label htmlFor="dt-active" className="text-body-sm">Active — will show up in doc pickers</label>
          </div>
        </div>

        {/* Fields — only visible after the Type exists */}
        {!isNew && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant">Fields</span>
              {!showNewField && (
                <Button variant="outline" size="sm" icon="add" onClick={() => setShowNewField(true)}>Add Field</Button>
              )}
            </div>
            <Table
              columns={[
                { header: 'Code',     key: 'code',          width: '150px' },
                { header: 'Label',    key: 'label' },
                { header: 'Kind',     key: 'kind',          width: '140px',
                  render: r => FIELD_KINDS.find(k => k.value === r.kind)?.label ?? String(r.kind ?? '') },
                { header: 'Required', key: 'is_required',   width: '90px',
                  render: r => r.is_required ? <Badge variant="warning">Yes</Badge> : <span className="text-on-surface-variant">No</span> },
                { header: 'Order',    key: 'display_order', width: '70px', align: 'right' },
                { header: '',         key: '_del',          width: '50px', align: 'right',
                  render: (row: Record<string, unknown>) => (
                    <button
                      onClick={e => { e.stopPropagation(); removeField(row.id as number) }}
                      className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container transition-colors">
                      <Icon name="close" size={14} />
                    </button>
                  ),
                },
              ]}
              data={fields as unknown as Record<string, unknown>[]}
              loading={fieldsLoading}
              empty="No fields — add one to make pickers appear on documents of this Type."
            />

            {showNewField && (
              <div className="mt-3 p-4 rounded-lg border border-outline-variant bg-surface-container-low space-y-3">
                <p className="text-label-mono font-label-mono uppercase text-on-surface-variant">New Field</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-label-mono font-label-mono uppercase text-on-surface-variant">Code</label>
                    <Input value={String(newField.code ?? '')} onChange={e => setNewField(v => ({ ...v, code: e.target.value }))} placeholder="original_po" />
                  </div>
                  <div>
                    <label className="text-label-mono font-label-mono uppercase text-on-surface-variant">Label</label>
                    <Input value={String(newField.label ?? '')} onChange={e => setNewField(v => ({ ...v, label: e.target.value }))} placeholder="Original PO" />
                  </div>
                  <div>
                    <label className="text-label-mono font-label-mono uppercase text-on-surface-variant">Kind</label>
                    <select
                      value={String(newField.kind ?? '')}
                      onChange={e => setNewField(v => ({ ...v, kind: e.target.value }))}
                      className="w-full rounded border border-outline-variant bg-surface px-2 py-1.5 text-body-sm"
                    >
                      {FIELD_KINDS.map(k => (
                        <option key={k.value} value={k.value}>{k.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-label-mono font-label-mono uppercase text-on-surface-variant">Display order</label>
                    <Input type="number" value={String(newField.display_order ?? 0)} onChange={e => setNewField(v => ({ ...v, display_order: Number(e.target.value) }))} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="dt-field-req" checked={!!newField.is_required} onChange={e => setNewField(v => ({ ...v, is_required: e.target.checked }))} />
                    <label htmlFor="dt-field-req" className="text-body-sm">Required</label>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="primary" size="sm" icon="add" onClick={addField}>Add</Button>
                  <Button variant="outline" size="sm" onClick={() => setShowNewField(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
