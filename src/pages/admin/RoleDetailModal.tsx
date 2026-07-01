import { useState, useEffect } from 'react'
import { Button } from '../../components/ui'
import { Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { Badge } from '../../components/ui/Badge'
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api'

interface Permission { id: number; resource: string; action: string; description?: string }

interface Role extends Record<string, unknown> {
  id?:          number
  name:         string
  description?: string
  is_system?:   boolean
  permissions?: Permission[]
}

interface Props {
  isOpen:    boolean
  onClose:   () => void
  onRefresh: () => void
  role:      Role | null // null = create mode
}

// Role edit modal — different from DocDetailModal because:
//  * name/description save is a single PUT
//  * permissions are a bulk-replace via POST /:id/permissions with a full array
//  * system roles are read-only (is_system flag from BE)
export function RoleDetailModal({ isOpen, onClose, onRefresh, role }: Props) {
  const isCreate = role === null
  const isSystem = !isCreate && !!role?.is_system

  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [allPerms,     setAllPerms]     = useState<Permission[]>([])
  const [selected,     setSelected]     = useState<Set<number>>(new Set())
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => {
    if (!isOpen) return
    setError('')
    setConfirmDelete(false)
    setName(role?.name ?? '')
    setDescription(role?.description ?? '')

    // Load the full permission catalog + the role's current permissions
    apiGet<Permission[]>('/api/v1/permissions').then(setAllPerms).catch(() => setAllPerms([]))

    if (!isCreate && role?.id) {
      apiGet<Role>(`/api/v1/roles/${role.id}`)
        .then(full => {
          const ids = new Set<number>((full.permissions ?? []).map(p => p.id))
          setSelected(ids)
        })
        .catch(() => setSelected(new Set()))
    } else {
      setSelected(new Set())
    }
  }, [isOpen, role, isCreate])

  function togglePerm(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      let roleID = role?.id
      if (isCreate) {
        const created = await apiPost<{ id: number }>('/api/v1/roles', { name, description })
        roleID = created.id
      } else if (!isSystem) {
        await apiPut(`/api/v1/roles/${roleID}`, { name, description })
      }

      // Permissions — BE's AssignPermissions is a bulk-replace. It rejects
      // an empty array (validate:"required,min=1"), so if selected is empty
      // we call DELETE per current permission instead.
      if (roleID && !isSystem) {
        const ids = [...selected]
        if (ids.length > 0) {
          await apiPost(`/api/v1/roles/${roleID}/permissions`, { permission_ids: ids })
        } else if (role?.permissions?.length) {
          // Fall back to removing existing one by one
          for (const p of role.permissions) {
            await apiDelete(`/api/v1/roles/${roleID}/permissions/${p.id}`).catch(() => {})
          }
        }
      }

      onRefresh()
      onClose()
    } catch (e) {
      setError((e as Error).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!role?.id) return
    setError('')
    setDeleting(true)
    try {
      await apiDelete(`/api/v1/roles/${role.id}`)
      onRefresh()
      onClose()
    } catch (e) {
      setError((e as Error).message ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  // Group perms by resource so the picker is readable
  const groups: Record<string, Permission[]> = {}
  for (const p of allPerms) {
    if (!groups[p.resource]) groups[p.resource] = []
    groups[p.resource].push(p)
  }
  const groupKeys = Object.keys(groups).sort()

  const title = (
    <span className="flex items-center gap-2">
      {isCreate ? 'New Role' : (role?.name ?? 'Role')}
      {isSystem && <Badge variant="secondary">System</Badge>}
    </span>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex items-center gap-2 flex-wrap">
          {error && (
            <span className="text-label-mono font-label-mono text-error flex items-center gap-1 mr-auto">
              <Icon name="error" size={14} /> {error}
            </span>
          )}
          {!isCreate && !isSystem && (
            confirmDelete ? (
              <>
                <span className="text-body-sm text-error mr-auto">Delete this role?</span>
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
                <Button variant="danger" size="sm" icon="delete" loading={deleting} onClick={handleDelete} data-testid="role-delete-confirm">
                  Yes, delete
                </Button>
              </>
            ) : (
              <Button variant="danger" size="sm" icon="delete" onClick={() => setConfirmDelete(true)} disabled={saving} data-testid="role-delete">
                Delete
              </Button>
            )
          )}
          {!confirmDelete && (
            <>
              <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Close</Button>
              {!isSystem && (
                <Button variant="primary" size="sm" loading={saving} onClick={handleSave} data-testid="role-save">
                  {isCreate ? 'Create Role' : 'Save Changes'}
                </Button>
              )}
            </>
          )}
        </div>
      }
    >
      <div className="space-y-5" data-testid="role-modal">
        {isSystem && (
          <div className="p-3 rounded bg-warning/10 border border-warning/20 text-body-sm text-warning">
            This is a system role — its name, description and permissions cannot be edited.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div data-testid="field-name">
            <label className="text-label-mono font-label-mono text-on-surface-variant">
              Name <span className="text-error">*</span>
            </label>
            <input
              id="name"
              className="mt-1 w-full px-component-padding-x py-component-padding-y rounded border border-outline-variant bg-surface-container-lowest text-body-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-60"
              value={name}
              disabled={isSystem}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div data-testid="field-description">
            <label className="text-label-mono font-label-mono text-on-surface-variant">Description</label>
            <input
              id="description"
              className="mt-1 w-full px-component-padding-x py-component-padding-y rounded border border-outline-variant bg-surface-container-lowest text-body-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-60"
              value={description}
              disabled={isSystem}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-label-mono font-label-mono uppercase tracking-wider text-on-surface-variant">
              Permissions
            </span>
            <span className="text-label-mono font-label-mono text-on-surface-variant">
              {selected.size} selected
            </span>
          </div>
          <div className="max-h-[45vh] overflow-y-auto border border-outline-variant rounded-lg divide-y divide-outline-variant">
            {groupKeys.map(g => (
              <div key={g} className="p-3">
                <div className="text-label-mono font-label-mono uppercase text-primary mb-2">{g}</div>
                <div className="grid grid-cols-2 gap-2">
                  {groups[g].map(p => {
                    const on = selected.has(p.id)
                    return (
                      <label
                        key={p.id}
                        className={[
                          'flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors border',
                          on
                            ? 'bg-primary-container/30 border-primary/30 text-on-surface'
                            : 'border-transparent hover:bg-surface-container-high text-on-surface-variant',
                          isSystem ? 'cursor-not-allowed opacity-60' : '',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={isSystem}
                          onChange={() => togglePerm(p.id)}
                          data-testid={`perm-${p.resource}-${p.action}`}
                        />
                        <span className="text-body-sm font-body-sm">{p.action}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
            {groupKeys.length === 0 && (
              <div className="p-6 text-center text-body-sm text-on-surface-variant">No permissions defined</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
