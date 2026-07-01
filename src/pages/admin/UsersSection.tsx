import { useState, useEffect, useMemo } from 'react'
import { Button, Input, Select } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { UserDetailModal } from './UserDetailModal'
import { InviteUserModal } from './InviteUserModal'

interface User extends Record<string, unknown> {
  id:         number
  email:      string
  first_name: string
  last_name:  string
  role:       string
  status:     string
}

// Users list endpoint returns { users: [], total, limit, offset } — flatten
// to a plain array for the Table component.
interface UsersPayload { users: User[] }

const COLS: Column<Record<string, unknown>>[] = [
  { header: 'Email',     key: 'email',      width: '260px' },
  { header: 'Name',      key: '_name',      width: '200px',
    render: r => `${(r.first_name as string) ?? ''} ${(r.last_name as string) ?? ''}`.trim() || '—' },
  { header: 'Role',      key: 'role',       width: '160px',
    render: r => <span className="text-body-sm text-on-surface font-semibold">{String(r.role ?? '—')}</span> },
  { header: 'Status',    key: 'status',     width: '120px',
    render: r => <StatusBadge status={String(r.status ?? 'active')} /> },
]

const STATUS_FILTER = [
  { value: '',          label: 'All statuses' },
  { value: 'active',    label: 'Active' },
  { value: 'inactive',  label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
]

export function UsersSection() {
  const [data,    setData]    = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalUser,   setModalUser]   = useState<User | null | undefined>(undefined)
  const [inviteOpen,  setInviteOpen]  = useState(false)

  function load() {
    setLoading(true)
    apiGet<UsersPayload>('/api/v1/users?limit=100')
      .then(res => setData(Array.isArray(res?.users) ? res.users : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let rows = data
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(u =>
        u.email.toLowerCase().includes(q) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
      )
    }
    if (statusFilter) rows = rows.filter(u => u.status === statusFilter)
    return rows
  }, [data, search, statusFilter])

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Input
          id="user-search"
          placeholder="Search by email or name..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="w-48">
          <Select
            id="user-status-filter"
            options={STATUS_FILTER}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          iconLeft="add"
          className="ml-auto"
          onClick={() => setInviteOpen(true)}
          data-testid="invite-user"
        >
          Invite User
        </Button>
      </div>

      <Table
        columns={COLS}
        data={filtered}
        loading={loading}
        empty="No users found"
        onRowClick={row => setModalUser(row as User)}
      />

      {modalUser !== undefined && (
        <UserDetailModal
          isOpen
          onClose={() => setModalUser(undefined)}
          onRefresh={load}
          user={modalUser}
        />
      )}

      {inviteOpen && (
        <InviteUserModal
          isOpen
          onClose={() => setInviteOpen(false)}
          onCreated={load}
        />
      )}
    </>
  )
}
