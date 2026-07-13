import { useState, useEffect } from 'react'
import { Button } from '../../components/ui'
import { Modal } from '../../components/ui/Modal'
import { Table, type Column } from '../../components/ui/Table'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api'
import { FieldControl, buildForm, type FieldDef } from '../master-data/CrudSection'
import { AuditLogPanel } from './AuditLogPanel'
import { RecordListPanel } from './RecordListPanel'
import { DocumentTypeFields, saveDocumentTypeValues, type DocumentFieldValues } from '../../components/documents/DocumentTypeFields'

export interface WorkflowAction {
  label:           string
  action:          string
  variant:         'primary' | 'danger' | 'outline'
  icon?:           string
  visibleStatuses: string[]
}

interface Props {
  isOpen:              boolean
  onClose:             () => void
  onRefresh:           () => void
  endpoint:            string
  doc:                 Record<string, unknown> | null
  entityLabel:         string
  headerFields:        FieldDef[]
  lineFields?:         FieldDef[]
  lineColumns?:        Column<Record<string, unknown>>[]
  lineEndpointSuffix?: string
  editableStatuses?:   string[]
  workflowActions?:    WorkflowAction[]
  idKey?:              string
  listSubFields?:      string[]
  /** Enables the DocumentType-driven custom-field block below the header.
   * Set to the entity's model key (e.g. 'GRN', 'MR', 'GI'). When set, the
   * modal renders fields for whatever DocumentType is picked, and persists
   * their values via /documents/:kind/:id/fields on save. */
  docKind?:            string
}

export function DocDetailModal({
  isOpen, onClose, onRefresh,
  endpoint, doc, entityLabel,
  headerFields,
  lineFields = [],
  lineColumns = [],
  lineEndpointSuffix = 'items',
  editableStatuses = ['DRAFT'],
  workflowActions = [],
  idKey = 'id',
  listSubFields,
  docKind,
}: Props) {
  // navDoc: record the user navigated to via the list panel (overrides doc prop)
  const [navDoc, setNavDoc] = useState<Record<string, unknown> | null>(null)
  const activeDoc  = navDoc ?? doc
  const isCreate   = activeDoc === null
  const docId      = activeDoc?.[idKey] as number | undefined
  const status     = String(activeDoc?.status ?? 'DRAFT')
  const isEditable = isCreate || editableStatuses.includes(status)

  const [form,          setForm]          = useState<Record<string, unknown>>({})
  const [headerLoading, setHeaderLoading] = useState(false)
  const [lines,         setLines]         = useState<Record<string, unknown>[]>([])
  const [linesLoading,  setLinesLoading]  = useState(false)
  const [addForm,       setAddForm]       = useState<Record<string, unknown>>({})
  const [showAddForm,   setShowAddForm]   = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [actioning,     setActioning]     = useState<string | null>(null)
  const [error,         setError]         = useState('')
  const [showLogs,      setShowLogs]      = useState(false)
  const [showList,      setShowList]      = useState(true)
  // Values for the DocumentType-driven picker slots. Only meaningful when docKind is set.
  const [dtValues,      setDtValues]      = useState<DocumentFieldValues>({})

  // Derive audit resource from endpoint: /api/v1/<module>/... → <module>
  const auditResource = endpoint.split('/').filter(p => p && p !== 'api' && p !== 'v1')[0] ?? ''

  // Reset state and load data when modal opens or the parent's doc prop changes
  useEffect(() => {
    if (!isOpen) return
    setNavDoc(null)
    setError('')
    setShowAddForm(false)
    setShowLogs(false)
    setShowList(true)
    setLines([])
    setDtValues({})
    if (!doc) {
      setForm(buildForm(headerFields.filter(f => !f.editOnly)))
      setAddForm(buildForm(lineFields))
      return
    }
    setForm(buildForm(headerFields.filter(f => !f.createOnly), doc))
    setAddForm(buildForm(lineFields))
    const id = doc[idKey] as number | undefined
    if (id) {
      setHeaderLoading(true)
      apiGet<Record<string, unknown>>(`${endpoint}/${id}`)
        .then(full => setForm(buildForm(headerFields.filter(f => !f.createOnly), full)))
        .catch(() => {})
        .finally(() => setHeaderLoading(false))
    }
  }, [isOpen, doc]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload form when user navigates to a different record via the list panel
  useEffect(() => {
    if (!isOpen || !navDoc) return
    const id = navDoc[idKey] as number | undefined
    if (!id) return
    setError('')
    setShowAddForm(false)
    setLines([])
    setForm(buildForm(headerFields.filter(f => !f.createOnly), navDoc))
    setAddForm(buildForm(lineFields))
    setHeaderLoading(true)
    apiGet<Record<string, unknown>>(`${endpoint}/${id}`)
      .then(full => setForm(buildForm(headerFields.filter(f => !f.createOnly), full)))
      .catch(() => {})
      .finally(() => setHeaderLoading(false))
  }, [navDoc]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load line items whenever the active document ID changes
  useEffect(() => {
    if (!isOpen || isCreate || !docId || lineFields.length === 0) return
    setLinesLoading(true)
    apiGet<Record<string, unknown>[]>(`${endpoint}/${docId}/${lineEndpointSuffix}`)
      .then(rows => setLines(Array.isArray(rows) ? rows : []))
      .catch(() => setLines([]))
      .finally(() => setLinesLoading(false))
  }, [isOpen, docId]) // eslint-disable-line react-hooks/exhaustive-deps

  function addLine() {
    const { _new: _, ...rest } = addForm
    setLines(prev => [...prev, { ...rest, _new: true, _localId: Date.now() }])
    setAddForm(buildForm(lineFields))
    setShowAddForm(false)
  }

  function removeLine(line: Record<string, unknown>) {
    if (line._new) {
      setLines(prev => prev.filter(l => l !== line))
    } else {
      setLines(prev => prev.map(l => l === line ? { ...l, _deleted: true } : l))
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const headerBody = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '')
      )

      let id: number
      if (isCreate) {
        const created = await apiPost<Record<string, unknown>>(endpoint, headerBody)
        id = created[idKey] as number
      } else {
        await apiPut(`${endpoint}/${docId}`, headerBody)
        id = docId!
      }

      for (const l of lines.filter(l => l._deleted && !l._new)) {
        await apiDelete(`${endpoint}/${id}/${lineEndpointSuffix}/${l[idKey]}`)
      }
      for (const l of lines.filter(l => l._new && !l._deleted)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _new: _n, _deleted: _d, _localId: _li, ...lineBody } = l
        // Strip empty-string fields — Go's JSON decoder rejects "" for numeric
        // or pointer-uint fields (matches the header save behaviour above).
        const cleanedLine = Object.fromEntries(
          Object.entries(lineBody).filter(([, v]) => v !== '')
        )
        await apiPost(`${endpoint}/${id}/${lineEndpointSuffix}`, cleanedLine)
      }

      // Persist any DocumentType-driven picker values in one batch.
      if (docKind && Object.keys(dtValues).length > 0) {
        try {
          await saveDocumentTypeValues(docKind, id, dtValues)
        } catch { /* non-fatal — values can be re-saved later */ }
      }

      onClose()
      onRefresh()
    } catch (e) {
      setError((e as Error).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleAction(wa: WorkflowAction) {
    setActioning(wa.action)
    setError('')
    try {
      await apiPost(`${endpoint}/${docId}/${wa.action}`, {})
      onClose()
      onRefresh()
    } catch (e) {
      setError((e as Error).message ?? `${wa.label} failed`)
    } finally {
      setActioning(null)
    }
  }

  const visibleLines     = lines.filter(l => !l._deleted)
  const visibleWorkflows = workflowActions.filter(a => !isCreate && a.visibleStatuses.includes(status))

  const linesWithActions: Column<Record<string, unknown>>[] = isEditable
    ? [
        ...lineColumns,
        {
          header: '', key: '_del', width: '40px', align: 'right',
          render: row => (
            <button
              onClick={e => { e.stopPropagation(); removeLine(row) }}
              className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
            >
              <Icon name="close" size={14} />
            </button>
          ),
        },
      ]
    : lineColumns

  const titleNode = isCreate
    ? `New ${entityLabel}`
    : (
      <span className="flex items-center gap-2">
        {String(activeDoc?.code ?? entityLabel)}
        <StatusBadge status={status} />
      </span>
    )

  const logPanel = !isCreate && docId
    ? <AuditLogPanel resource={auditResource} resourceId={String(docId)} />
    : undefined

  const listPanel = !isCreate && showList
    ? <RecordListPanel endpoint={endpoint} currentId={docId} idKey={idKey} onSelect={setNavDoc} subFields={listSubFields} />
    : undefined

  const modalSize = isCreate
    ? 'xl'
    : showList && showLogs ? '3xl'
    : showList || showLogs ? '2xl'
    : 'xl'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      size={modalSize}
      leftPanel={listPanel}
      headerExtra={!isCreate && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowList(v => !v)}
            title={showList ? 'Hide record list' : 'Show record list'}
            className={[
              'p-1.5 rounded transition-colors',
              showList
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high',
            ].join(' ')}
          >
            <Icon name="menu_open" size={18} />
          </button>
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
        </div>
      )}
      panel={showLogs ? logPanel : undefined}
      footer={
        <div className="flex items-center gap-2 flex-wrap">
          {error && (
            <span className="text-label-mono font-label-mono text-error flex items-center gap-1 mr-auto">
              <Icon name="error" size={14} /> {error}
            </span>
          )}
          {visibleWorkflows.map(a => (
            <Button
              key={a.action}
              variant={a.variant}
              size="sm"
              icon={a.icon}
              loading={actioning === a.action}
              disabled={saving || (actioning !== null && actioning !== a.action)}
              onClick={() => handleAction(a)}
              data-testid={`workflow-${a.action}`}
            >
              {a.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving || !!actioning} data-testid="doc-close">
            Close
          </Button>
          {isEditable && (
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              disabled={!!actioning}
              onClick={handleSave}
              data-testid="doc-save"
            >
              {isCreate ? `Create ${entityLabel}` : 'Save Changes'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6" data-testid="doc-modal">
        {/* Header form */}
        <div className="relative">
          {headerLoading && (
            <div className="absolute inset-0 flex items-start justify-end pointer-events-none z-10">
              <span className="text-[11px] text-label-mono font-label-mono text-on-surface-variant flex items-center gap-1 mt-1">
                <Icon name="progress_activity" size={12} className="animate-spin" />
                Loading…
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {(isCreate
              ? headerFields.filter(f => !f.editOnly)
              : headerFields.filter(f => !f.createOnly)
            ).map(f => (
              <div key={f.key} className={f.span ? 'col-span-2' : ''} data-testid={`field-${f.key}`}>
                <FieldControl
                  field={f}
                  value={form[f.key]}
                  onChange={v => setForm(p => ({ ...p, [f.key]: v }))}
                  disabled={!isEditable}
                />
              </div>
            ))}
            {/* Type-driven picker slots appear inline in the same grid so the
                form reads as one continuous set of fields. */}
            {docKind && (
              <DocumentTypeFields
                docKind={docKind}
                docId={docId}
                typeId={form.document_type_id ? Number(form.document_type_id) : undefined}
                values={dtValues}
                onChange={setDtValues}
              />
            )}
          </div>
        </div>

        {/* Line items */}
        {lineFields.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant">
                Line Items
              </span>
              {isEditable && !showAddForm && (
                <Button variant="outline" size="sm" icon="add" onClick={() => setShowAddForm(true)} data-testid="line-add">
                  Add Line
                </Button>
              )}
            </div>

            <Table
              columns={linesWithActions}
              data={visibleLines}
              loading={linesLoading}
              empty="No line items yet"
            />

            {showAddForm && isEditable && (
              <div className="mt-3 p-4 rounded-lg border border-outline-variant bg-surface-container-low space-y-4">
                <p className="text-[11px] text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant">
                  New Line
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {lineFields.map(f => (
                    <div key={f.key} className={f.span ? 'col-span-2' : ''} data-testid={`line-field-${f.key}`}>
                      <FieldControl
                        field={f}
                        value={addForm[f.key]}
                        onChange={v => setAddForm(p => ({ ...p, [f.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="primary" size="sm" icon="add" onClick={addLine} data-testid="line-add-confirm">
                    Add to Lines
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
