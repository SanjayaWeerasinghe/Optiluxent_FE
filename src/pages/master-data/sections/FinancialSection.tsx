import { useState } from 'react'
import { Tabs, type TabItem } from '../../../components/ui/Tabs'
import { Badge } from '../../../components/ui'
import { CrudSection, ActiveBadge, type FieldDef } from '../CrudSection'
import { type Column } from '../../../components/ui/Table'
import { currencyOptions, coaOptions, bankOptions, fiscalYearOptions } from '../useOptions'

const ENTITY_TABS: TabItem[] = [
  { id: 'currencies',    label: 'Currencies',        icon: 'currency_exchange' },
  { id: 'exchange-rates',label: 'Exchange Rates',    icon: 'swap_horiz' },
  { id: 'payment-terms', label: 'Payment Terms',     icon: 'receipt_long' },
  { id: 'coa',           label: 'Chart of Accounts', icon: 'account_tree' },
  { id: 'cost-centers',  label: 'Cost Centers',      icon: 'hub' },
  { id: 'tax-codes',     label: 'Tax Codes',         icon: 'percent' },
  { id: 'banks',         label: 'Banks',             icon: 'account_balance' },
  { id: 'bank-accounts', label: 'Bank Accounts',     icon: 'credit_card' },
]

const BASE = '/api/v1/masterdata/financial'

// ── Currencies ────────────────────────────────────────────────────────────────
const CUR_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',   key: 'code',    width: '80px' },
  { header: 'Name',   key: 'name' },
  { header: 'Symbol', key: 'symbol',  width: '70px' },
  { header: 'Base',   key: 'is_base', width: '70px',
    render: r => r.is_base ? <Badge variant="primary">Base</Badge> : null },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const CUR_FIELDS: FieldDef[] = [
  { key: 'code',      label: 'Code (3 chars)', type: 'text', required: true, placeholder: 'LKR' },
  { key: 'name',      label: 'Name',           type: 'text', required: true, placeholder: 'Sri Lanka Rupee' },
  { key: 'symbol',    label: 'Symbol',         type: 'text', required: true, placeholder: 'Rs' },
  { key: 'is_active', label: 'Active',         type: 'toggle', editOnly: true },
]

// ── Exchange Rates ────────────────────────────────────────────────────────────
const ER_COLS: Column<Record<string, unknown>>[] = [
  { header: 'From', key: 'from_currency_id', width: '80px' },
  { header: 'To',   key: 'to_currency_id',   width: '80px' },
  { header: 'Rate', key: 'rate',             width: '100px', align: 'right',
    render: r => Number(r.rate ?? 0).toFixed(6) },
  { header: 'Effective Date', key: 'effective_date', width: '130px' },
  { header: 'Source',         key: 'source',         width: '90px' },
]

const ER_FIELDS: FieldDef[] = [
  { key: 'from_currency_id', label: 'From Currency', type: 'select', required: true, loadOptions: currencyOptions() },
  { key: 'to_currency_id',   label: 'To Currency',   type: 'select', required: true, loadOptions: currencyOptions() },
  { key: 'rate',             label: 'Rate',           type: 'number', required: true, min: 0, step: 0.000001 },
  { key: 'effective_date',   label: 'Effective Date', type: 'date',   required: true },
  { key: 'source',           label: 'Source',         type: 'text',   placeholder: 'manual' },
]

// ── Payment Terms ─────────────────────────────────────────────────────────────
const PT_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',       key: 'code',            width: '100px' },
  { header: 'Name',       key: 'name' },
  { header: 'Due Days',   key: 'due_days',         width: '90px', align: 'right' },
  { header: 'Disc. Days', key: 'discount_days',    width: '90px', align: 'right' },
  { header: 'Disc. %',    key: 'discount_percent', width: '80px', align: 'right' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const PT_FIELDS: FieldDef[] = [
  { key: 'code',             label: 'Code',            type: 'text',   required: true, placeholder: 'NET30' },
  { key: 'name',             label: 'Name',            type: 'text',   required: true, placeholder: 'Net 30 Days' },
  { key: 'due_days',         label: 'Due Days',        type: 'number', min: 0, step: 1 },
  { key: 'discount_days',    label: 'Discount Days',   type: 'number', min: 0, step: 1 },
  { key: 'discount_percent', label: 'Discount %',      type: 'number', min: 0, step: 0.01 },
  { key: 'is_active',        label: 'Active',          type: 'toggle', editOnly: true },
]

// ── Chart of Accounts ─────────────────────────────────────────────────────────
const COA_TYPES = [
  { value: 'ASSET', label: 'Asset' }, { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' }, { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
]

const COA_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',  key: 'code',         width: '100px' },
  { header: 'Name',  key: 'name' },
  { header: 'Type',  key: 'account_type', width: '110px' },
  { header: 'Level', key: 'level',        width: '60px', align: 'center' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const COA_FIELDS: FieldDef[] = [
  { key: 'code',         label: 'Code',         type: 'text',   required: true, placeholder: '1001' },
  { key: 'name',         label: 'Name',         type: 'text',   required: true, placeholder: 'Cash and Bank' },
  { key: 'account_type', label: 'Account Type', type: 'select', required: true, options: COA_TYPES },
  { key: 'currency_id',  label: 'Currency',     type: 'select', required: true, loadOptions: currencyOptions() },
  { key: 'is_active',    label: 'Active',       type: 'toggle', editOnly: true },
]

// ── Cost Centers ──────────────────────────────────────────────────────────────
const CC_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code', key: 'code', width: '100px' },
  { header: 'Name', key: 'name' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const CC_FIELDS: FieldDef[] = [
  { key: 'code',      label: 'Code', type: 'text', required: true, placeholder: 'CC-PROD' },
  { key: 'name',      label: 'Name', type: 'text', required: true, placeholder: 'Production' },
  { key: 'is_active', label: 'Active', type: 'toggle', editOnly: true },
]

// ── Tax Codes ─────────────────────────────────────────────────────────────────
const TAX_TYPES = [
  { value: 'VAT', label: 'VAT' }, { value: 'WHT', label: 'Withholding Tax' },
  { value: 'NBT', label: 'NBT' }, { value: 'OTHER', label: 'Other' },
]

const TAX_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code', key: 'code',     width: '100px' },
  { header: 'Name', key: 'name' },
  { header: 'Type', key: 'tax_type', width: '80px' },
  { header: 'Rate %', key: 'rate',   width: '80px', align: 'right' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const TAX_FIELDS: FieldDef[] = [
  { key: 'code',          label: 'Code',          type: 'text',   required: true, placeholder: 'VAT18' },
  { key: 'name',          label: 'Name',          type: 'text',   required: true, placeholder: 'VAT 18%' },
  { key: 'tax_type',      label: 'Tax Type',      type: 'select', required: true, options: TAX_TYPES },
  { key: 'rate',          label: 'Rate (%)',       type: 'number', min: 0, step: 0.01 },
  { key: 'gl_account_id', label: 'GL Account',    type: 'select', required: true, loadOptions: coaOptions() },
  { key: 'is_active',     label: 'Active',        type: 'toggle', editOnly: true },
]

// ── Banks ─────────────────────────────────────────────────────────────────────
const BANK_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Name',   key: 'name' },
  { header: 'Branch', key: 'branch_name' },
  { header: 'SWIFT',  key: 'swift_code', width: '110px' },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const BANK_FIELDS: FieldDef[] = [
  { key: 'name',        label: 'Bank Name',  type: 'text', required: true, placeholder: 'Bank of Ceylon' },
  { key: 'branch_name', label: 'Branch',     type: 'text', placeholder: 'Colombo 3' },
  { key: 'swift_code',  label: 'SWIFT Code', type: 'text', placeholder: 'BCEYLKLX' },
  { key: 'address',     label: 'Address',    type: 'textarea', rows: 2 },
]

// ── Bank Accounts ─────────────────────────────────────────────────────────────
const BA_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Account No.',  key: 'account_number', width: '150px' },
  { header: 'Account Name', key: 'account_name' },
  { header: 'Default', key: 'is_default', width: '80px', align: 'center',
    render: r => r.is_default ? <Badge variant="primary">Default</Badge> : null },
  { header: 'Status', key: 'is_active', width: '90px', render: r => <ActiveBadge value={r.is_active} /> },
]

const BA_FIELDS: FieldDef[] = [
  { key: 'bank_id',        label: 'Bank',           type: 'select', required: true, loadOptions: bankOptions() },
  { key: 'account_number', label: 'Account Number', type: 'text',   required: true },
  { key: 'account_name',   label: 'Account Name',   type: 'text',   required: true },
  { key: 'currency_id',    label: 'Currency',        type: 'select', required: true, loadOptions: currencyOptions() },
  { key: 'gl_account_id',  label: 'GL Account',     type: 'select', required: true, loadOptions: coaOptions() },
  { key: 'is_default',     label: 'Default Account', type: 'toggle' },
  { key: 'is_active',      label: 'Active',         type: 'toggle', editOnly: true },
]

export function FinancialSection() {
  const [tab, setTab] = useState('currencies')

  return (
    <div className="space-y-4">
      <Tabs tabs={ENTITY_TABS} active={tab} onChange={setTab} size="sm" />
      <div className="pt-2">
        {tab === 'currencies'     && <CrudSection endpoint={`${BASE}/currencies`}      columns={CUR_COLS} fields={CUR_FIELDS} searchFields={['code','name']} entityLabel="Currency" />}
        {tab === 'exchange-rates' && <CrudSection endpoint={`${BASE}/exchange-rates`}  columns={ER_COLS}  fields={ER_FIELDS}  searchFields={[]}             entityLabel="Exchange Rate" canDelete={false} />}
        {tab === 'payment-terms'  && <CrudSection endpoint={`${BASE}/payment-terms`}   columns={PT_COLS}  fields={PT_FIELDS}  searchFields={['code','name']} entityLabel="Payment Term" />}
        {tab === 'coa'            && <CrudSection endpoint={`${BASE}/chart-of-accounts`} columns={COA_COLS} fields={COA_FIELDS} searchFields={['code','name']} entityLabel="Account" />}
        {tab === 'cost-centers'   && <CrudSection endpoint={`${BASE}/cost-centers`}    columns={CC_COLS}  fields={CC_FIELDS}  searchFields={['code','name']} entityLabel="Cost Center" />}
        {tab === 'tax-codes'      && <CrudSection endpoint={`${BASE}/tax-codes`}       columns={TAX_COLS} fields={TAX_FIELDS} searchFields={['code','name']} entityLabel="Tax Code" />}
        {tab === 'banks'          && <CrudSection endpoint={`${BASE}/banks`}           columns={BANK_COLS} fields={BANK_FIELDS} searchFields={['name','branch_name']} entityLabel="Bank" canDelete={false} />}
        {tab === 'bank-accounts'  && <CrudSection endpoint={`${BASE}/bank-accounts`}  columns={BA_COLS}  fields={BA_FIELDS}  searchFields={['account_number','account_name']} entityLabel="Bank Account" />}
      </div>
    </div>
  )
}
