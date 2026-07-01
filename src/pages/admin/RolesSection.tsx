import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { RoleDetailModal } from './RoleDetailModal'

interface Role extends Record<string, unknown> {
  id:           number
  name:         string
  description?: string
  is_system?:   boolean
  permissions?: Array<{ id: number }>
}

const COLS: Column<Record<string, unknown>>[] = [
  { header: 'Name',        key: 'name',          width: '180px',
    render: r => <span className="font-semibold text-on-surface">{String(r.name ?? '')}</span> },
  { header: 'Description', key: 'description' },
  { header: '#Perms',      key: '_perms',        width: '80px', align: 'right',
    render: r => (r.permissions as Array<unknown> | undefined)?.length ?? 0 },
  { header: '',            key: '_system',       width: '90px',
    render: r => r.is_system ? <Badge variant="secondary">System</Badge> : null },
]

export function RolesSection() {
  const [data,    setData]    = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [modalRole, setModalRole] = useState<Role | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Role[]>('/api/v1/roles')
      .then(rows => setData(Array.isArray(rows) ? rows : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q)
    )
  }, [data, search])

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Input
          id="role-search"
          placeholder="Search roles..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          variant="primary"
          size="sm"
          iconLeft="add"
          className="ml-auto"
          onClick={() => setModalRole(null)}
          data-testid="new-role"
        >
          New Role
        </Button>
      </div>

      <Table
        columns={COLS}
        data={filtered}
        loading={loading}
        empty="No roles found"
        onRowClick={row => setModalRole(row as Role)}
      />

      {modalRole !== undefined && (
        <RoleDetailModal
          isOpen
          onClose={() => setModalRole(undefined)}
          onRefresh={load}
          role={modalRole}
        />
      )}
    </>
  )
}
