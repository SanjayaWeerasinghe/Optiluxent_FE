import { useState, useEffect, useMemo } from 'react'
import { Input } from '../../components/ui'
import { Icon } from '../../components/ui/Icon'
import { apiGet } from '../../lib/api'

interface Permission {
  id:           number
  resource:     string
  action:       string
  description?: string
}

// Permissions catalog — read-only. Displayed grouped by resource because
// pairs like (users, read), (users, update), (users, delete) sit together
// semantically. Filters across all three fields.
export function PermissionsSection() {
  const [data,    setData]    = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    setLoading(true)
    apiGet<Permission[]>('/api/v1/permissions')
      .then(rows => setData(Array.isArray(rows) ? rows : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = q
      ? data.filter(p =>
          p.resource.toLowerCase().includes(q) ||
          p.action.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
        )
      : data
    const groups: Record<string, Permission[]> = {}
    for (const p of filtered) {
      if (!groups[p.resource]) groups[p.resource] = []
      groups[p.resource].push(p)
    }
    return Object.keys(groups).sort().map(k => ({ resource: k, perms: groups[k].sort((a, b) => a.action.localeCompare(b.action)) }))
  }, [data, search])

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Input
          id="perm-search"
          placeholder="Search permissions..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-label-mono font-label-mono text-on-surface-variant ml-auto">
          {data.length} total
        </span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-body-sm text-on-surface-variant flex items-center justify-center gap-2">
          <Icon name="progress_activity" size={16} className="animate-spin" /> Loading permissions…
        </div>
      ) : grouped.length === 0 ? (
        <div className="py-8 text-center text-body-sm text-on-surface-variant">
          No permissions match "{search}"
        </div>
      ) : (
        <div className="space-y-6" data-testid="permissions-grid">
          {grouped.map(({ resource, perms }) => (
            <div key={resource} className="border border-outline-variant rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
                <span className="text-label-mono font-label-mono uppercase tracking-wider text-primary">{resource}</span>
                <span className="text-label-mono font-label-mono text-on-surface-variant">{perms.length}</span>
              </div>
              <table className="w-full">
                <thead className="text-label-mono font-label-mono text-on-surface-variant">
                  <tr className="border-b border-outline-variant">
                    <th className="px-4 py-2 text-left w-40">Action</th>
                    <th className="px-4 py-2 text-left">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-body-sm">
                  {perms.map(p => (
                    <tr key={p.id} className="hover:bg-surface-container-high">
                      <td className="px-4 py-2 font-semibold text-on-surface">{p.action}</td>
                      <td className="px-4 py-2 text-on-surface-variant">{p.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
