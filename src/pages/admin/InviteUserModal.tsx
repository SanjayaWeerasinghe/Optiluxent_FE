import { useState, useEffect } from 'react'
import { Button } from '../../components/ui'
import { Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { apiPost, apiPut } from '../../lib/api'
import { FieldControl, type FieldDef } from '../master-data/CrudSection'
import { roleOptions } from './useAdminOptions'

interface Props {
  isOpen:    boolean
  onClose:   () => void
  onCreated: () => void
}

const INVITE_FIELDS: FieldDef[] = [
  { key: 'email',      label: 'Email',      type: 'text',   required: true, placeholder: 'user@example.com' },
  { key: 'password',   label: 'Password',   type: 'text',   required: true, placeholder: 'min. 8 characters' },
  { key: 'first_name', label: 'First Name', type: 'text',   required: true },
  { key: 'last_name',  label: 'Last Name',  type: 'text' },
  { key: 'role_id',    label: 'Role',       type: 'select', loadOptions: roleOptions() },
]

// InviteUserModal creates a new user via the two-step BE flow:
//   1. POST /auth/register  (creates user with the default 'user' role)
//   2. PUT /users/:id/role  (assigns the role picked in the form)
export function InviteUserModal({ isOpen, onClose, onCreated }: Props) {
  const [form,   setForm]   = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    if (!isOpen) return
    setForm({ email: '', password: '', first_name: '', last_name: '', role_id: '' })
    setError('')
  }, [isOpen])

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      const created = await apiPost<{ id: number }>('/api/v1/auth/register', {
        email:      form.email,
        password:   form.password,
        first_name: form.first_name,
        last_name:  form.last_name,
      })
      const roleID = typeof form.role_id === 'number' ? form.role_id : Number(form.role_id)
      if (roleID && created.id) {
        // Ignore failure here — the user exists; role can be set from the edit
        // modal afterwards. Surface the error though so the admin knows.
        try {
          await apiPut(`/api/v1/users/${created.id}/role`, { role_id: roleID })
        } catch (e) {
          setError(`User created but role assignment failed: ${(e as Error).message}`)
          onCreated() // still refresh the list so the new user shows up
          return
        }
      }
      onCreated()
      onClose()
    } catch (e) {
      setError((e as Error).message ?? 'Invite failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite User"
      size="md"
      footer={
        <div className="flex items-center gap-2 flex-wrap">
          {error && (
            <span className="text-label-mono font-label-mono text-error flex items-center gap-1 mr-auto">
              <Icon name="error" size={14} /> {error}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave} data-testid="invite-save">
            Create User
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4" data-testid="invite-modal">
        {INVITE_FIELDS.map(f => (
          <div key={f.key} className={f.key === 'role_id' ? 'col-span-2' : ''} data-testid={`field-${f.key}`}>
            <FieldControl
              field={f}
              value={form[f.key]}
              onChange={v => setForm(p => ({ ...p, [f.key]: v }))}
            />
          </div>
        ))}
      </div>
    </Modal>
  )
}
