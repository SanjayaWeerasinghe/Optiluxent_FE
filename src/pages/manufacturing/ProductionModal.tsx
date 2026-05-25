import { useState, useEffect } from 'react'
import { Button } from '../../components/ui'
import { Modal } from '../../components/ui/Modal'
import { Table, type Column } from '../../components/ui/Table'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api'
import { FieldControl, buildForm, type FieldDef } from '../master-data/CrudSection'
import { AuditLogPanel } from '../procurement/AuditLogPanel'
import {
  productOptions, uomOptions, warehouseOptions,
  productionPlanOptions, workCenterOptions,
} from '../master-data/useOptions'

const BASE = '/api/v1/manufacturing'

const RESOURCE_TYPES = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'LABOR',    label: 'Labor' },
  { value: 'OVERHEAD', label: 'Overhead' },
]

const HEADER_FIELDS: FieldDef[] = [
  { key: 'code',        label: 'Code',         type: 'text',   required: true, placeholder: 'MO-00001' },
  { key: 'plan_id',     label: 'Plan',         type: 'select', loadOptions: productionPlanOptions() },
  { key: 'product_id',  label: 'Product',      type: 'select', required: true, loadOptions: productOptions() },
  { key: 'uom_id',      label: 'UOM',          type: 'select', required: true, loadOptions: uomOptions() },
  { key: 'planned_qty', label: 'Planned Qty',  type: 'number', min: 0, step: 0.001 },
  { key: 'warehouse_id', label: 'Warehouse',   type: 'select', required: true, loadOptions: warehouseOptions() },
  { key: 'start_date',  label: 'Start Date',   type: 'date' },
  { key: 'end_date',    label: 'End Date',     type: 'date' },
  { key: 'notes',       label: 'Notes',        type: 'textarea', rows: 2, span: true },
  { key: 'produced_qty', label: 'Produced Qty', type: 'number', editOnly: true },
]

const OUTPUT_FIELDS: FieldDef[] = [
  { key: 'product_id',  label: 'Product',    type: 'select', required: true, loadOptions: productOptions() },
  { key: 'uom_id',      label: 'UOM',        type: 'select', required: true, loadOptions: uomOptions() },
  { key: 'quantity',    label: 'Quantity',   type: 'number', required: true, min: 0, step: 0.001 },
  { key: 'unit_cost',   label: 'Unit Cost',  type: 'number', min: 0, step: 0.01 },
  { key: 'warehouse_id', label: 'Warehouse', type: 'select', loadOptions: warehouseOptions() },
  { key: 'notes',       label: 'Notes',      type: 'text',   span: true },
]

const RESOURCE_FIELDS: FieldDef[] = [
  { key: 'resource_type',  label: 'Type',        type: 'select', required: true, options: RESOURCE_TYPES },
  { key: 'product_id',     label: 'Product',     type: 'select', loadOptions: productOptions() },
  { key: 'work_center_id', label: 'Work Center', type: 'select', loadOptions: workCenterOptions() },
  { key: 'description',    label: 'Description', type: 'text',   span: true },
  { key: 'quantity',       label: 'Quantity',    type: 'number', min: 0, step: 0.001 },
  { key: 'uom_id',         label: 'UOM',         type: 'select', loadOptions: uomOptions() },
  { key: 'unit_cost',      label: 'Unit Cost',   type: 'number', min: 0, step: 0.01 },
  { key: 'notes',          label: 'Notes',       type: 'text',   span: true },
]

const OUTPUT_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',         key: 'line_number', width: '44px', align: 'center' },
  { header: 'Product',   key: 'product_id',  width: '90px' },
  { header: 'Qty',       key: 'quantity',    width: '80px',  align: 'right' },
  { header: 'Unit Cost', key: 'unit_cost',   width: '90px',  align: 'right',
    render: r => Number(r.unit_cost ?? 0).toFixed(2) },
  { header: 'Total Cost', key: 'total_cost', width: '100px', align: 'right',
    render: r => Number(r.total_cost ?? 0).toFixed(2) },
]

const RESOURCE_COLS: Column<Record<string, unknown>>[] = [
  { header: '#',    key: 'line_number',  width: '44px', align: 'center' },
  { header: 'Type', key: 'resource_type', width: '90px' },
  { header: 'Description', key: 'description' },
  { header: 'Qty',         key: 'quantity',   width: '70px', align: 'right' },
  { header: 'Unit Cost',   key: 'unit_cost',  width: '90px', align: 'right',
    render: r => Number(r.unit_cost ?? 0).toFixed(2) },
  { header: 'Total Cost',  key: 'total_cost', width: '100px', align: 'right',
    render: r => Number(r.total_cost ?? 0).toFixed(2) },
]

const WORKFLOW_ACTIONS = [
  { label: 'Start Production', action: 'start',    variant: 'primary' as const, icon: 'play_arrow',   visibleStatuses: ['DRAFT'] },
  { label: 'Complete',         action: 'complete', variant: 'primary' as const, icon: 'check_circle', visibleStatuses: ['IN_PROGRESS'] },
  { label: 'Cancel',           action: 'cancel',   variant: 'danger'  as const, icon: 'block',        visibleStatuses: ['DRAFT', 'IN_PROGRESS'] },
]

const EDITABLE_STATUSES = ['DRAFT', 'IN_PROGRESS']

interface Props {
  isOpen:    boolean
  onClose:   () => void
  onRefresh: () => void
  doc:       Record<string, unknown> | null
}

export function ProductionModal({ isOpen, onClose, onRefresh, doc }: Props) {
  const isCreate = doc === null
  const docId    = doc?.id as number | undefined
  const status   = String(doc?.status ?? 'DRAFT')
  const isEditable = isCreate || EDITABLE_STATUSES.includes(status)

  const [form,           setForm]           = useState<Record<string, unknown>>({})
  const [headerLoading,  setHeaderLoading]  = useState(false)
  const [outputs,        setOutputs]        = useState<Record<string, unknown>[]>([])
  const [resources,      setResources]      = useState<Record<string, unknown>[]>([])
  const [linesLoading,   setLinesLoading]   = useState(false)
  const [addOutputForm,  setAddOutputForm]  = useState<Record<string, unknown>>({})
  const [addResForm,     setAddResForm]     = useState<Record<string, unknown>>({})
  const [showAddOutput,  setShowAddOutput]  = useState(false)
  const [showAddRes,     setShowAddRes]     = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [actioning,      setActioning]      = useState<string | null>(null)
  const [error,          setError]          = useState('')
  const [showLogs,       setShowLogs]       = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setError('')
    setShowAddOutput(false)
    setShowAddRes(false)
    setShowLogs(false)
    setOutputs([])
    setResources([])
    if (isCreate) {
      setForm(buildForm(HEADER_FIELDS.filter(f => !f.editOnly)))
      setAddOutputForm(buildForm(OUTPUT_FIELDS))
      setAddResForm(buildForm(RESOURCE_FIELDS))
      return
    }
    setForm(buildForm(HEADER_FIELDS.filter(f => !f.createOnly), doc as Record<string, unknown>))
    setAddOutputForm(buildForm(OUTPUT_FIELDS))
    setAddResForm(buildForm(RESOURCE_FIELDS))
    if (docId) {
      setHeaderLoading(true)
      apiGet<Record<string, unknown>>(`${BASE}/orders/${docId}`)
        .then(full => setForm(buildForm(HEADER_FIELDS.filter(f => !f.createOnly), full)))
        .catch(() => {})
        .finally(() => setHeaderLoading(false))
    }
  }, [isOpen, doc]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen || isCreate || !docId) return
    setLinesLoading(true)
    Promise.all([
      apiGet<Record<string, unknown>[]>(`${BASE}/orders/${docId}/outputs`),
      apiGet<Record<string, unknown>[]>(`${BASE}/orders/${docId}/resources`),
    ])
      .then(([outs, ress]) => {
        setOutputs(Array.isArray(outs) ? outs : [])
        setResources(Array.isArray(ress) ? ress : [])
      })
      .catch(() => {})
      .finally(() => setLinesLoading(false))
  }, [isOpen, docId]) // eslint-disable-line react-hooks/exhaustive-deps

  function addOutputLine() {
    setOutputs(prev => [...prev, { ...addOutputForm, _new: true, _localId: Date.now() }])
    setAddOutputForm(buildForm(OUTPUT_FIELDS))
    setShowAddOutput(false)
  }

  function addResourceLine() {
    setResources(prev => [...prev, { ...addResForm, _new: true, _localId: Date.now() }])
    setAddResForm(buildForm(RESOURCE_FIELDS))
    setShowAddRes(false)
  }

  function removeOutput(line: Record<string, unknown>) {
    if (line._new) setOutputs(prev => prev.filter(l => l !== line))
    else setOutputs(prev => prev.map(l => l === line ? { ...l, _deleted: true } : l))
  }

  function removeResource(line: Record<string, unknown>) {
    if (line._new) setResources(prev => prev.filter(l => l !== line))
    else setResources(prev => prev.map(l => l === line ? { ...l, _deleted: true } : l))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
      let id: number
      if (isCreate) {
        const created = await apiPost<Record<string, unknown>>(`${BASE}/orders`, body)
        id = created.id as number
      } else {
        await apiPut(`${BASE}/orders/${docId}`, body)
        id = docId!
      }
      for (const l of outputs.filter(l => l._deleted && !l._new))
        await apiDelete(`${BASE}/orders/${id}/outputs/${l.id}`)
      for (const l of outputs.filter(l => l._new && !l._deleted)) {
        const { _new: _n, _deleted: _d, _localId: _li, ...lb } = l
        await apiPost(`${BASE}/orders/${id}/outputs`, lb)
      }
      for (const l of resources.filter(l => l._deleted && !l._new))
        await apiDelete(`${BASE}/orders/${id}/resources/${l.id}`)
      for (const l of resources.filter(l => l._new && !l._deleted)) {
        const { _new: _n, _deleted: _d, _localId: _li, ...lb } = l
        await apiPost(`${BASE}/orders/${id}/resources`, lb)
      }
      onClose()
      onRefresh()
    } catch (e) {
      setError((e as Error).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleAction(action: string, label: string) {
    setActioning(action)
    setError('')
    try {
      await apiPost(`${BASE}/orders/${docId}/${action}`, {})
      onClose()
      onRefresh()
    } catch (e) {
      setError((e as Error).message ?? `${label} failed`)
    } finally {
      setActioning(null)
    }
  }

  const visibleOutputs   = outputs.filter(l => !l._deleted)
  const visibleResources = resources.filter(l => !l._deleted)

  const outputsWithDel: Column<Record<string, unknown>>[] = isEditable
    ? [...OUTPUT_COLS, { header: '', key: '_del', width: '40px', align: 'right' as const,
        render: (row: Record<string, unknown>) => (
          <button onClick={e => { e.stopPropagation(); removeOutput(row) }}
            className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container transition-colors">
            <Icon name="close" size={14} />
          </button>
        ),
      }]
    : OUTPUT_COLS

  const resourcesWithDel: Column<Record<string, unknown>>[] = isEditable
    ? [...RESOURCE_COLS, { header: '', key: '_del', width: '40px', align: 'right' as const,
        render: (row: Record<string, unknown>) => (
          <button onClick={e => { e.stopPropagation(); removeResource(row) }}
            className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container transition-colors">
            <Icon name="close" size={14} />
          </button>
        ),
      }]
    : RESOURCE_COLS

  const titleNode = isCreate ? 'New Production Order' : (
    <span className="flex items-center gap-2">
      {String(doc?.code ?? 'Production Order')}
      <StatusBadge status={status} />
    </span>
  )

  const visibleActions = WORKFLOW_ACTIONS.filter(a => !isCreate && a.visibleStatuses.includes(status))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      size={showLogs ? '2xl' : 'xl'}
      headerExtra={!isCreate && (
        <button
          onClick={() => setShowLogs(v => !v)}
          title={showLogs ? 'Hide audit log' : 'Show audit log'}
          className={[
            'p-1.5 rounded transition-colors',
            showLogs
              ? 'bg-primary/10 text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-high',
          ].join(' ')}
        >
          <Icon name="history" size={18} />
        </button>
      )}
      panel={showLogs && !isCreate && docId
        ? <AuditLogPanel resource="manufacturing" resourceId={String(docId)} />
        : undefined
      }
      footer={
        <div className="flex items-center gap-2 flex-wrap">
          {error && (
            <span className="text-label-mono font-label-mono text-error flex items-center gap-1 mr-auto">
              <Icon name="error" size={14} /> {error}
            </span>
          )}
          {visibleActions.map(a => (
            <Button key={a.action} variant={a.variant} size="sm" icon={a.icon}
              loading={actioning === a.action}
              disabled={saving || (actioning !== null && actioning !== a.action)}
              onClick={() => handleAction(a.action, a.label)}>
              {a.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving || !!actioning}>
            Close
          </Button>
          {isEditable && (
            <Button variant="primary" size="sm" loading={saving} disabled={!!actioning} onClick={handleSave}>
              {isCreate ? 'Create Order' : 'Save Changes'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="relative">
          {headerLoading && (
            <div className="absolute inset-0 flex items-start justify-end pointer-events-none z-10">
              <span className="text-[11px] text-label-mono font-label-mono text-on-surface-variant flex items-center gap-1 mt-1">
                <Icon name="progress_activity" size={12} className="animate-spin" /> Loading…
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {(isCreate
              ? HEADER_FIELDS.filter(f => !f.editOnly)
              : HEADER_FIELDS.filter(f => !f.createOnly)
            ).map(f => (
              <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                <FieldControl
                  field={f}
                  value={form[f.key]}
                  onChange={v => setForm(p => ({ ...p, [f.key]: v }))}
                  disabled={!isEditable}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Outputs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant">
              Products Out (Outputs)
            </span>
            {isEditable && !showAddOutput && (
              <Button variant="outline" size="sm" icon="add" onClick={() => setShowAddOutput(true)}>
                Add Output
              </Button>
            )}
          </div>
          <Table columns={outputsWithDel} data={visibleOutputs} loading={linesLoading} empty="No outputs yet" />
          {showAddOutput && isEditable && (
            <div className="mt-3 p-4 rounded-lg border border-outline-variant bg-surface-container-low space-y-4">
              <p className="text-[11px] text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant">
                New Output
              </p>
              <div className="grid grid-cols-2 gap-3">
                {OUTPUT_FIELDS.map(f => (
                  <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                    <FieldControl field={f} value={addOutputForm[f.key]}
                      onChange={v => setAddOutputForm(p => ({ ...p, [f.key]: v }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="primary" size="sm" icon="add" onClick={addOutputLine}>Add to Outputs</Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddOutput(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Resources */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant">
              Resources In (Materials &amp; Labor)
            </span>
            {isEditable && !showAddRes && (
              <Button variant="outline" size="sm" icon="add" onClick={() => setShowAddRes(true)}>
                Add Resource
              </Button>
            )}
          </div>
          <Table columns={resourcesWithDel} data={visibleResources} loading={linesLoading} empty="No resources yet" />
          {showAddRes && isEditable && (
            <div className="mt-3 p-4 rounded-lg border border-outline-variant bg-surface-container-low space-y-4">
              <p className="text-[11px] text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant">
                New Resource
              </p>
              <div className="grid grid-cols-2 gap-3">
                {RESOURCE_FIELDS.map(f => (
                  <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                    <FieldControl field={f} value={addResForm[f.key]}
                      onChange={v => setAddResForm(p => ({ ...p, [f.key]: v }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="primary" size="sm" icon="add" onClick={addResourceLine}>Add to Resources</Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddRes(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
