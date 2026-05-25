import { useState } from 'react'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { Badge } from '../../../components/ui'
import { CrudSection, ActiveBadge, type FieldDef } from '../CrudSection'
import { type Column } from '../../../components/ui/Table'
import { currencyOptions, paymentTermOptions } from '../useOptions'

const ENTITY_TABS: TabItem[] = [
  { id: 'parties', label: 'Parties / Business Partners', icon: 'handshake' },
]

const BASE = '/api/v1/masterdata/contacts'

// ── Parties ───────────────────────────────────────────────────────────────────
const PARTY_TYPES = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'BOTH',     label: 'Customer & Supplier' },
  { value: 'OTHER',    label: 'Other' },
]

const PARTY_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code', key: 'code',  width: '100px' },
  { header: 'Name', key: 'name' },
  {
    header: 'Type', key: 'party_type', width: '110px',
    render: r => {
      const t = String(r.party_type ?? '')
      const v = t === 'CUSTOMER' ? 'info'
              : t === 'SUPPLIER' ? 'warning'
              : t === 'BOTH'     ? 'primary'
              : 'secondary'
      return <Badge variant={v}>{t}</Badge>
    },
  },
  { header: 'Tax Reg',      key: 'tax_reg_number', width: '120px' },
  { header: 'Credit Limit', key: 'credit_limit',   width: '110px', align: 'right',
    render: r => Number(r.credit_limit ?? 0).toLocaleString(),
  },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const PARTY_FIELDS: FieldDef[] = [
  { key: 'code',            label: 'Code',            type: 'text',   required: true, placeholder: 'SUP-001' },
  { key: 'name',            label: 'Name',            type: 'text',   required: true, placeholder: 'ABC Suppliers Ltd' },
  { key: 'legal_name',      label: 'Legal Name',      type: 'text',   placeholder: 'ABC Suppliers (Pvt) Ltd' },
  { key: 'party_type',      label: 'Party Type',      type: 'select', required: true, options: PARTY_TYPES },
  { key: 'tax_reg_number',  label: 'Tax Reg No.',     type: 'text',   placeholder: 'VAT123456' },
  { key: 'currency_id',     label: 'Currency',        type: 'select', required: true, loadOptions: currencyOptions() },
  { key: 'payment_term_id', label: 'Payment Term',    type: 'select', loadOptions: paymentTermOptions() },
  { key: 'credit_limit',    label: 'Credit Limit',    type: 'number', min: 0, step: 0.01 },
  { key: 'notes',           label: 'Notes',           type: 'textarea', rows: 2 },
  { key: 'is_active',       label: 'Active',          type: 'toggle', editOnly: true },
]

export function ContactsSection() {
  const [tab, setTab] = useState('parties')

  return (
    <div className="space-y-4">
      <Tabs tabs={ENTITY_TABS} active={tab} onChange={setTab} size="sm" />
      <div className="pt-2">
        {tab === 'parties' && (
          <CrudSection
            endpoint={`${BASE}/parties`}
            columns={PARTY_COLS}
            fields={PARTY_FIELDS}
            searchFields={['code', 'name', 'tax_reg_number']}
            entityLabel="Party"
          />
        )}
      </div>
    </div>
  )
}
