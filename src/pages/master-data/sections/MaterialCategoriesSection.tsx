import { CrudSection, ActiveBadge, type FieldDef } from '../CrudSection'
import { type Column } from '../../../components/ui/Table'
import { materialCategoryOptions } from '../useOptions'

const BASE = '/api/v1/masterdata/material-categories'

const COLUMNS: Column<Record<string, unknown>>[] = [
  { header: 'Code',   key: 'code',        width: '120px' },
  { header: 'Name',   key: 'name' },
  { header: 'Parent', key: 'parent_name', width: '160px', render: r => (r.parent_name as string) || '—' },
  { header: 'Path',   key: 'path',        render: r => <span className="text-on-surface-variant">{r.path as string}</span> },
  { header: 'Status', key: 'is_active',   width: '90px',  render: r => <ActiveBadge value={r.is_active} /> },
]

const FIELDS: FieldDef[] = [
  { key: 'code',      label: 'Code',        type: 'text',   required: true, placeholder: 'CAT-001', createOnly: true },
  { key: 'name',      label: 'Name',        type: 'text',   required: true, placeholder: 'Category name' },
  {
    key:         'parent_id',
    label:       'Parent Category',
    type:        'select',
    placeholder: 'None (root category)',
    loadOptions: materialCategoryOptions(),
  },
  { key: 'is_active', label: 'Active', type: 'toggle', editOnly: true },
]

export function MaterialCategoriesSection() {
  return (
    <CrudSection
      endpoint={BASE}
      columns={COLUMNS}
      fields={FIELDS}
      searchFields={['code', 'name']}
      entityLabel="Category"
    />
  )
}
