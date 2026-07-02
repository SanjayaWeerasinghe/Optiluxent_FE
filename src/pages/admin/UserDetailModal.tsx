import { useState, useEffect } from 'react'
import { Button } from '../../components/ui'
import { Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet, apiPut, apiDelete } from '../../lib/api'
import { FieldControl, type FieldDef } from '../master-data/CrudSection'
import { roleOptions } from './useAdminOptions'

interface Props {
  isOpen:    boolean
  onClose:   () => void
  onRefresh: () => void
  user:      Record<string, unknown> | null   // null means we shouldn't render (create is handled elsewhere)
}

const STATUS_OPTS = [
  { value: 'active',    label: 'Active' },
  { value: 'inactive',  label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
]

const USER_FIELDS: FieldDef[] = [
  { key: 'email',      label: 'Email',      type: 'text',   editOnly: true }, // read-only in edit mode (BE doesn't update email via /users/:id)
  { key: 'first_name', label: 'First Name', type: 'text',   required: true },
  { key: 'last_name',  label: 'Last Name',  type: 'text' },
  { key: 'status',     label: 'Status',     type: 'select', options: STATUS_OPTS, required: true },
  { key: 'role_id',    label: 'Role',       type: 'select', loadOptions: roleOptions() },
]

// UserDetailModal edits an existing user. Because the backend splits its
// mutation surface — PUT /users/:id for name/status, PUT /users/:id/role for
// the role — we can't reuse DocDetailModal (single-endpoint). This modal saves
// each part conditionally and only closes when both succeed.
export function UserDetailModal({ isOpen, onClose, onRefresh, user }: Props) {
  const [form, setForm] = useState<Record<string, unknown>>({})
  // Snapshot of the initial role_id so we only PUT /role if it changed.
  const [initialRoleID, setInitialRoleID] = useState<number | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!isOpen || !user) return
    setError('')
    setConfirmDelete(false)
    // Load fresh — but we also need to fetch the role_id from /roles because
    // the user response only carries the role NAME. The invite/edit flows
    // work on IDs, so resolve name→id once when the modal opens.
    setForm({
      email:      user.email as string,
      first_name: (user.first_name as string) ?? '',
      last_name:  (user.last_name as string) ?? '',
      status:     (user.status as string) ?? 'active',
      role_id:    '',
    })
    const roleName = user.role as string | undefined
    if (roleName) {
      apiGet<Array<{ id: number; name: string }>>('/api/v1/roles')
        .then(rows => {
          const match = rows.find(r => r.name === roleName)
          if (match) {
            setForm(prev => ({ ...prev, role_id: match.id }))
            setInitialRoleID(match.id)
          }
        })
        .catch(() => {})
    } else {
      setInitialRoleID(null)
    }
  }, [isOpen, user])

  if (!user) return null
  const userID = user.id as number

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      // 1) Base fields — PUT /users/:id
      await apiPut(`/api/v1/users/${userID}`, {
        first_name: form.first_name,
        last_name:  form.last_name,
        status:     form.status,
      })

      // 2) Role — only if it changed
      const newRoleID = typeof form.role_id === 'number' ? form.role_id : Number(form.role_id)
      if (newRoleID && newRoleID !== initialRoleID) {
        await apiPut(`/api/v1/users/${userID}/role`, { role_id: newRoleID })
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
    setError('')
    setDeleting(true)
    try {
      await apiDelete(`/api/v1/users/${userID}`)
      onRefresh()
      onClose()
    } catch (e) {
      setError((e as Error).message ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const title = (
    <span className="flex items-center gap-2">
      {form.email as string || 'User'}
      <StatusBadge status={(form.status as string) ?? 'active'} />
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
          {confirmDelete ? (
            <>
              <span className="text-body-sm font-body-sm text-error mr-auto">Delete this user? This cannot be undone.</span>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" size="sm" icon="delete" loading={deleting} onClick={handleDelete} data-testid="user-delete-confirm">
                Yes, delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="danger" size="sm" icon="delete" onClick={() => setConfirmDelete(true)} disabled={saving} data-testid="user-delete">
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Close</Button>
              <Button variant="primary" size="sm" loading={saving} onClick={handleSave} data-testid="user-save">
                Save Changes
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4" data-testid="user-modal">
        {USER_FIELDS.map(f => (
          <div key={f.key} data-testid={`field-${f.key}`}>
            <FieldControl
              field={f}
              value={form[f.key]}
              onChange={v => setForm(p => ({ ...p, [f.key]: v }))}
              disabled={f.key === 'email'}  // email is display-only in the edit modal
            />
          </div>
        ))}
      </div>
    </Modal>
  )
}
