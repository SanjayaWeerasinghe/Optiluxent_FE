import { useState } from 'react'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { Badge } from '../../../components/ui'
import { CrudSection, ActiveBadge, type FieldDef } from '../CrudSection'
import { type Column } from '../../../components/ui/Table'
import { currencyOptions, departmentOptions, jobPositionOptions } from '../useOptions'

const ENTITY_TABS: TabItem[] = [
  { id: 'job-positions', label: 'Job Positions', icon: 'work' },
  { id: 'employees',     label: 'Employees',     icon: 'badge' },
]

const BASE = '/api/v1/masterdata/hr'

// ── Job Positions ─────────────────────────────────────────────────────────────
const JP_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code', key: 'code', width: '100px' },
  { header: 'Name', key: 'name' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const JP_FIELDS: FieldDef[] = [
  { key: 'code',      label: 'Code', type: 'text', required: true, placeholder: 'MGR-OPS' },
  { key: 'name',      label: 'Name', type: 'text', required: true, placeholder: 'Operations Manager' },
  { key: 'is_active', label: 'Active', type: 'toggle', editOnly: true },
]

// ── Employees ─────────────────────────────────────────────────────────────────
const EMP_TYPES = [
  { value: 'PERMANENT',  label: 'Permanent' },
  { value: 'CONTRACT',   label: 'Contract' },
  { value: 'PART_TIME',  label: 'Part-Time' },
  { value: 'INTERN',     label: 'Intern' },
]

const EMP_GENDER = [
  { value: 'MALE',   label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER',  label: 'Other' },
]

const EMP_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code', key: 'code', width: '90px' },
  {
    header: 'Name', key: 'display_name',
    render: r => r.display_name || `${r.first_name} ${r.last_name}`,
  },
  {
    header: 'Type', key: 'employment_type', width: '110px',
    render: r => {
      const t = String(r.employment_type ?? '')
      const v = t === 'PERMANENT' ? 'success' : t === 'CONTRACT' ? 'warning' : 'secondary'
      return <Badge variant={v}>{t.replace('_', ' ')}</Badge>
    },
  },
  { header: 'Email',       key: 'email',       width: '180px' },
  { header: 'Date Joined', key: 'date_joined', width: '110px' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const EMP_FIELDS: FieldDef[] = [
  { key: 'code',             label: 'Employee Code',   type: 'text',   required: true, placeholder: 'EMP-001' },
  { key: 'first_name',       label: 'First Name',      type: 'text',   required: true },
  { key: 'last_name',        label: 'Last Name',       type: 'text',   required: true },
  { key: 'display_name',     label: 'Display Name',    type: 'text' },
  { key: 'gender',           label: 'Gender',          type: 'select', options: EMP_GENDER },
  { key: 'employment_type',  label: 'Employment Type', type: 'select', options: EMP_TYPES },
  { key: 'job_position_id',  label: 'Job Position',    type: 'select', loadOptions: jobPositionOptions() },
  { key: 'department_id',    label: 'Department',      type: 'select', loadOptions: departmentOptions() },
  { key: 'date_joined',      label: 'Date Joined',     type: 'date',   required: true },
  { key: 'email',            label: 'Email',           type: 'text',   placeholder: 'employee@company.com' },
  { key: 'phone',            label: 'Phone',           type: 'text' },
  { key: 'mobile',           label: 'Mobile',          type: 'text' },
  { key: 'currency_id',      label: 'Salary Currency', type: 'select', required: true, loadOptions: currencyOptions() },
  { key: 'basic_salary',     label: 'Basic Salary',    type: 'number', min: 0, step: 0.01 },
  { key: 'is_active',        label: 'Active',          type: 'toggle', editOnly: true },
]

export function HRSection() {
  const [tab, setTab] = useState('job-positions')

  return (
    <div className="space-y-4">
      <Tabs tabs={ENTITY_TABS} active={tab} onChange={setTab} size="sm" />
      <div className="pt-2">
        {tab === 'job-positions' && (
          <CrudSection
            endpoint={`${BASE}/job-positions`}
            columns={JP_COLS}
            fields={JP_FIELDS}
            searchFields={['code', 'name']}
            entityLabel="Job Position"
          />
        )}
        {tab === 'employees' && (
          <CrudSection
            endpoint={`${BASE}/employees`}
            columns={EMP_COLS}
            fields={EMP_FIELDS}
            searchFields={['code', 'first_name', 'last_name', 'email']}
            entityLabel="Employee"
          />
        )}
      </div>
    </div>
  )
}
