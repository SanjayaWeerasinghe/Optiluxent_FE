import { apiGet } from '../../lib/api'
import { type SelectOption } from '../master-data/CrudSection'

// Option loaders for the admin module dropdowns. Each returns a thunk so it
// can be passed directly into a FieldDef.loadOptions.

interface RoleRow      { id: number; name: string; description?: string }
interface PermissionRow { id: number; resource: string; action: string }

export function roleOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<RoleRow[]>('/api/v1/roles')
      .then(rows => rows.map(r => ({ value: r.id, label: r.name })))
      .catch(() => [])
}

export function permissionOptions(): () => Promise<SelectOption[]> {
  return () =>
    apiGet<PermissionRow[]>('/api/v1/permissions')
      .then(rows => rows.map(p => ({ value: p.id, label: `${p.resource}:${p.action}` })))
      .catch(() => [])
}
