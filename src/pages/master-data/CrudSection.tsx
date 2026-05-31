import { useState, useEffect, useMemo } from 'react'
import { Button, Input, Select, Badge, Pagination } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { apiGetPaged, apiPost, apiPut, apiDelete } from '../../lib/api'

export interface SelectOption { value: string | number; label: string }

export interface FieldDef {
  key:          string
  label:        string
  type:         'text' | 'number' | 'select' | 'date' | 'textarea' | 'toggle'
  required?:    boolean
  placeholder?: string
  options?:     SelectOption[]
  loadOptions?: () => Promise<SelectOption[]>
  min?:         number
  step?:        number
  rows?:        number
  editOnly?:    boolean
  createOnly?:  boolean
  span?:        boolean  // take full width in 2-col layout
}

interface CrudSectionProps<T extends Record<string, unknown>> {
  endpoint:      string
  columns:       Column<T>[]
  fields:        FieldDef[]
  searchFields?: string[]
  idKey?:        string
  canDelete?:    boolean
  entityLabel?:  string
  listParams?:   string                    // appended as ?x=y to GET list only
  hiddenValues?: Record<string, unknown>  // merged into POST body, not shown in form
}

export function buildForm(fields: FieldDef[], data?: Record<string, unknown>): Record<string, unknown> {
  const form: Record<string, unknown> = {}
  for (const f of fields) {
    if (data !== undefined) {
      form[f.key] = data[f.key] ?? (f.type === 'toggle' ? false : '')
    } else {
      form[f.key] = f.type === 'toggle' ? true : ''
    }
  }
  return form
}

export function CrudSection<T extends Record<string, unknown>>({
  endpoint,
  columns,
  fields,
  searchFields = [],
  idKey = 'id',
  canDelete = true,
  entityLabel = 'Record',
  listParams,
  hiddenValues,
}: CrudSectionProps<T>) {
  const [data,       setData]       = useState<T[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)
  const [perPage,    setPerPage]    = useState(20)
  const [total,      setTotal]      = useState(0)
  const [modal,      setModal]      = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected,   setSelected]   = useState<T | null>(null)
  const [form,       setForm]       = useState<Record<string, unknown>>({})
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  function load(p: number, pp: number) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), per_page: String(pp) })
    if (listParams) listParams.split('&').forEach(kv => { const [k, v] = kv.split('='); if (k) params.set(k, v ?? '') })
    apiGetPaged<T>(`${endpoint}?${params}`)
      .then(({ data: rows, meta }) => {
        setData(Array.isArray(rows) ? rows : [])
        setTotal(meta.total)
      })
      .catch(e => setError(String((e as Error).message)))
      .finally(() => setLoading(false))
  }

  // Reset page when the endpoint or list filters change
  useEffect(() => {
    setPage(1)
    setSearch('')
  }, [endpoint, listParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch whenever page, perPage, endpoint, or listParams changes
  useEffect(() => {
    load(page, perPage)
  }, [page, perPage, endpoint, listParams]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePageChange(p: number) { setPage(p) }
  function handlePerPageChange(pp: number) { setPerPage(pp); setPage(1) }

  const filtered = useMemo(() => {
    if (!search || searchFields.length === 0) return data
    const q = search.toLowerCase()
    return data.filter(row =>
      searchFields.some(k => String(row[k] ?? '').toLowerCase().includes(q))
    )
  }, [data, search, searchFields])

  function openCreate() {
    setForm(buildForm(fields.filter(f => !f.editOnly)))
    setSelected(null)
    setModal('create')
    setError('')
  }

  function openEdit(row: T) {
    setForm(buildForm(fields.filter(f => !f.createOnly), row as Record<string, unknown>))
    setSelected(row)
    setModal('edit')
    setError('')
  }

  function openDelete(row: T) {
    setSelected(row)
    setModal('delete')
    setError('')
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(form)) {
        if (v === '') continue
        body[k] = v
      }
      if (modal === 'create') {
        await apiPost(endpoint, { ...hiddenValues, ...body })
      } else if (modal === 'edit' && selected) {
        await apiPut(`${endpoint}/${selected[idKey]}`, body)
      }
      setModal(null)
      load(page, perPage)
    } catch (e) {
      setError((e as Error).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      await apiDelete(`${endpoint}/${selected[idKey]}`)
      setModal(null)
      // If we deleted the last item on this page, go back one page
      const newPage = data.length === 1 && page > 1 ? page - 1 : page
      setPage(newPage)
      load(newPage, perPage)
    } catch (e) {
      setError((e as Error).message ?? 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const actionColumn: Column<T> = {
    header: '',
    key:    '_actions',
    width:  '72px',
    align:  'right',
    render: (row) => (
      <div className="flex items-center gap-1 justify-end">
        <button
          onClick={() => openEdit(row)}
          className="p-1.5 rounded text-on-surface-variant hover:bg-surface-container-high transition-colors"
          title="Edit"
        >
          <Icon name="edit" size={15} />
        </button>
        {canDelete && (
          <button
            onClick={() => openDelete(row)}
            className="p-1.5 rounded text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
            title="Delete"
          >
            <Icon name="delete" size={15} />
          </button>
        )}
      </div>
    ),
  }

  const visibleFields = (mode: 'create' | 'edit') =>
    fields.filter(f => mode === 'create' ? !f.editOnly : !f.createOnly)

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        {searchFields.length > 0 && (
          <Input
            id="crud-search"
            placeholder={`Search ${entityLabel.toLowerCase()}s...`}
            iconLeft="search"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="max-w-xs"
          />
        )}
        <Button
          variant="primary"
          size="sm"
          iconLeft="add"
          onClick={openCreate}
          className="ml-auto"
        >
          New {entityLabel}
        </Button>
      </div>

      <Table<T>
        columns={[...columns, actionColumn]}
        data={filtered}
        loading={loading}
        empty={`No ${entityLabel.toLowerCase()}s found`}
      />

      <Pagination
        page={page}
        perPage={perPage}
        total={search ? filtered.length : total}
        onPage={handlePageChange}
        onPerPage={handlePerPageChange}
      />

      {/* Create / Edit */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          isOpen
          onClose={() => setModal(null)}
          title={modal === 'create' ? `New ${entityLabel}` : `Edit ${entityLabel}`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3">
              {error && (
                <span className="text-label-mono font-label-mono text-error mr-auto flex items-center gap-1">
                  <Icon name="error" size={14} />
                  {error}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
                {modal === 'create' ? 'Create' : 'Save Changes'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {visibleFields(modal).map(f => (
              <FieldControl
                key={f.key}
                field={f}
                value={form[f.key]}
                onChange={v => setForm(p => ({ ...p, [f.key]: v }))}
              />
            ))}
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {modal === 'delete' && (
        <Modal
          isOpen
          onClose={() => setModal(null)}
          title={`Delete ${entityLabel}`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-3">
              {error && (
                <span className="text-label-mono font-label-mono text-error mr-auto">{error}</span>
              )}
              <Button variant="outline" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="danger" size="sm" loading={saving} onClick={handleDelete}>
                Delete
              </Button>
            </div>
          }
        >
          <p className="text-body-md font-body-md text-on-surface-variant">
            Are you sure you want to delete this {entityLabel.toLowerCase()}? This cannot be undone.
          </p>
        </Modal>
      )}
    </>
  )
}

// ── Active badge helper ───────────────────────────────────────────────────────
export function ActiveBadge({ value }: { value: unknown }) {
  return value
    ? <Badge variant="success" dot>Active</Badge>
    : <Badge variant="secondary" dot>Inactive</Badge>
}

// ── Internal form field control ───────────────────────────────────────────────
interface FieldControlProps {
  field:     FieldDef
  value:     unknown
  onChange:  (v: unknown) => void
  disabled?: boolean
}

export function FieldControl({ field, value, onChange, disabled = false }: FieldControlProps) {
  const [asyncOpts, setAsyncOpts] = useState<SelectOption[]>([])
  useEffect(() => {
    if (field.loadOptions) {
      field.loadOptions().then(setAsyncOpts).catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (field.type === 'select') {
    const opts = field.loadOptions ? asyncOpts : (field.options ?? [])
    return (
      <Select
        id={field.key}
        label={field.label}
        required={field.required}
        placeholder="Select..."
        options={opts}
        value={String(value ?? '')}
        disabled={disabled}
        onChange={e => !disabled && onChange(
          opts.length > 0 && typeof opts[0].value === 'number'
            ? (e.target.value === '' ? '' : Number(e.target.value))
            : e.target.value
        )}
      />
    )
  }

  if (field.type === 'toggle') {
    return (
      <div className="flex items-center justify-between py-1">
        <label className="text-label-mono font-label-mono text-on-surface-variant">{field.label}</label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(!value)}
          className={[
            'relative w-10 h-5 rounded-full transition-colors',
            value ? 'bg-primary' : 'bg-outline-variant',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-0.5 w-4 h-4 rounded-full bg-surface-container-lowest shadow-sm transition-transform',
              value ? 'translate-x-5' : 'translate-x-0.5',
            ].join(' ')}
          />
        </button>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="flex flex-col gap-unit">
        <label className="text-label-mono font-label-mono text-on-surface-variant">
          {field.label}
          {field.required && <span className="text-error ml-0.5">*</span>}
        </label>
        <textarea
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          className="w-full px-component-padding-x py-component-padding-y rounded border border-outline-variant bg-surface-container-lowest text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>
    )
  }

  return (
    <Input
      id={field.key}
      label={field.label}
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      placeholder={field.placeholder}
      required={field.required}
      disabled={disabled}
      min={field.min !== undefined ? String(field.min) : undefined}
      step={field.step !== undefined ? String(field.step) : undefined}
      value={String(value ?? '')}
      onChange={e => {
        if (field.type === 'number') {
          onChange(e.target.value === '' ? '' : Number(e.target.value))
        } else {
          onChange(e.target.value)
        }
      }}
    />
  )
}
