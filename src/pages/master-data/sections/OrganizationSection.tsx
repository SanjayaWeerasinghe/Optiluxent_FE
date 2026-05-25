import { useState, useEffect } from 'react'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { Badge, Button, Input } from '../../../components/ui'
import { Icon } from '../../../components/ui/Icon'
import { CrudSection, ActiveBadge, type FieldDef } from '../CrudSection'
import { type Column } from '../../../components/ui/Table'
import { apiGet, apiPut } from '../../../lib/api'

const ENTITY_TABS: TabItem[] = [
  { id: 'company',      label: 'Company Profile', icon: 'domain' },
  { id: 'departments',  label: 'Departments',     icon: 'corporate_fare' },
  { id: 'fiscal-years', label: 'Fiscal Years',    icon: 'calendar_month' },
  { id: 'sequences',    label: 'Doc Sequences',   icon: 'tag' },
]

const BASE = '/api/v1/masterdata/organization'

// ── Company Profile ───────────────────────────────────────────────────────────
interface CompanyData extends Record<string, unknown> {
  name?: string; legal_name?: string; tax_reg_number?: string
  email?: string; phone?: string; website?: string
  address_line1?: string; address_line2?: string
  city?: string; postal_code?: string
}

function CompanyProfileTab() {
  const [data,    setData]    = useState<CompanyData>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    apiGet<CompanyData>(`${BASE}/company`)
      .then(d => setData(d ?? {}))
      .catch(() => setData({}))
      .finally(() => setLoading(false))
  }, [])

  function set(key: string, val: string) {
    setData(p => ({ ...p, [key]: val }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false)
    try {
      await apiPut(`${BASE}/company`, data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-8 text-center text-on-surface-variant text-body-sm font-body-sm">Loading...</div>

  const field = (key: keyof CompanyData, label: string, placeholder?: string) => (
    <Input
      id={key}
      label={label}
      placeholder={placeholder}
      value={String(data[key] ?? '')}
      onChange={e => set(key, e.target.value)}
    />
  )

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        {field('name',           'Company Name',   'Optiluxent (Pvt) Ltd')}
        {field('legal_name',     'Legal Name')}
        {field('tax_reg_number', 'Tax Reg. No.',   'VAT123456789')}
        {field('email',          'Email',          'info@optiluxent.com')}
        {field('phone',          'Phone')}
        {field('website',        'Website',        'https://optiluxent.com')}
        {field('address_line1',  'Address Line 1')}
        {field('address_line2',  'Address Line 2')}
        {field('city',           'City')}
        {field('postal_code',    'Postal Code')}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" size="sm" loading={saving} onClick={handleSave} iconLeft="save">
          Save Profile
        </Button>
        {saved && (
          <span className="text-label-mono font-label-mono text-success flex items-center gap-1">
            <Icon name="check_circle" size={14} />
            Saved
          </span>
        )}
        {error && (
          <span className="text-label-mono font-label-mono text-error flex items-center gap-1">
            <Icon name="error" size={14} />
            {error}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Departments ───────────────────────────────────────────────────────────────
const DEPT_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code', key: 'code', width: '120px' },
  { header: 'Name', key: 'name' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const DEPT_FIELDS: FieldDef[] = [
  { key: 'code',      label: 'Code', type: 'text', required: true, placeholder: 'FIN' },
  { key: 'name',      label: 'Name', type: 'text', required: true, placeholder: 'Finance' },
  { key: 'is_active', label: 'Active', type: 'toggle', editOnly: true },
]

// ── Fiscal Years ──────────────────────────────────────────────────────────────
const FY_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Name',       key: 'name' },
  { header: 'Start Date', key: 'start_date', width: '120px' },
  { header: 'End Date',   key: 'end_date',   width: '120px' },
  {
    header: 'Status', key: 'is_closed', width: '90px',
    render: r => r.is_closed
      ? <Badge variant="secondary" dot>Closed</Badge>
      : <Badge variant="success" dot>Open</Badge>,
  },
]

const FY_FIELDS: FieldDef[] = [
  { key: 'name',       label: 'Name',       type: 'text', required: true, placeholder: 'FY 2025/26' },
  { key: 'start_date', label: 'Start Date', type: 'date', required: true },
  { key: 'end_date',   label: 'End Date',   type: 'date', required: true },
]

// ── Document Sequences ────────────────────────────────────────────────────────
const SEQ_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Document Type', key: 'document_type' },
  { header: 'Prefix',  key: 'prefix',      width: '80px' },
  { header: 'Suffix',  key: 'suffix',      width: '80px' },
  { header: 'Next #',  key: 'next_number', width: '80px', align: 'right' },
  { header: 'Padding', key: 'padding',     width: '80px', align: 'right' },
]

const SEQ_FIELDS: FieldDef[] = [
  { key: 'document_type', label: 'Document Type', type: 'text',   required: true, placeholder: 'PURCHASE_ORDER' },
  { key: 'prefix',        label: 'Prefix',        type: 'text',   required: true, placeholder: 'PO-' },
  { key: 'suffix',        label: 'Suffix',        type: 'text' },
  { key: 'next_number',   label: 'Next Number',   type: 'number', min: 1, step: 1 },
  { key: 'padding',       label: 'Padding Digits', type: 'number', min: 1, step: 1 },
]

export function OrganizationSection() {
  const [tab, setTab] = useState('company')

  return (
    <div className="space-y-4">
      <Tabs tabs={ENTITY_TABS} active={tab} onChange={setTab} size="sm" />
      <div className="pt-2">
        {tab === 'company'      && <CompanyProfileTab />}
        {tab === 'departments'  && (
          <CrudSection endpoint={`${BASE}/departments`} columns={DEPT_COLS} fields={DEPT_FIELDS}
            searchFields={['code', 'name']} entityLabel="Department" />
        )}
        {tab === 'fiscal-years' && (
          <CrudSection endpoint={`${BASE}/fiscal-years`} columns={FY_COLS} fields={FY_FIELDS}
            searchFields={['name']} entityLabel="Fiscal Year" canDelete={false} />
        )}
        {tab === 'sequences'    && (
          <CrudSection endpoint={`${BASE}/document-sequences`} columns={SEQ_COLS} fields={SEQ_FIELDS}
            searchFields={['document_type', 'prefix']} entityLabel="Sequence" />
        )}
      </div>
    </div>
  )
}
