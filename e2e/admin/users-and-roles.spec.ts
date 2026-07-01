// Admin module — Users & Access
// Exercises the three sections:
//   Users:       change a user's role via the UI, assert both UI and API reflect it
//   Roles:       create a throwaway role with 2 permissions, then delete it
//   Permissions: assert the read-only catalog renders with rows per resource
//
// The seeded `viewer@kadahapola.com` (id=4) is the test subject for the role
// change — we flip it to `manager` then back to `user` afterwards.
import { test, expect } from '../fixtures/auth'
import { getData } from '../fixtures/api'
import { gotoSection } from '../fixtures/selectors'

test.describe('Admin — Users & Access', () => {

  test('Users — change role via UI', async ({ loggedInPage: page, api }) => {
    // Look up viewer + the manager role via API
    const users = await api.get('/api/v1/users?limit=100').then(r => r.json())
    const viewer = (users.data.users as Array<{ id: number; email: string; role: string }>)
      .find(u => u.email === 'viewer@kadahapola.com')
    expect(viewer, 'seeded viewer user is required').toBeTruthy()
    const initialRole = viewer!.role

    const roles = await getData<Array<{ id: number; name: string }>>(api, '/api/v1/roles')
    const managerRole = roles.find(r => r.name === 'manager')
    const originalRole = roles.find(r => r.name === initialRole)
    expect(managerRole, 'manager role must exist').toBeTruthy()
    expect(originalRole, 'original role must exist').toBeTruthy()

    await gotoSection(page, 'admin','users')

    // Click the viewer's row
    await page.getByRole('cell', { name: 'viewer@kadahapola.com', exact: true }).click()
    await expect(page.getByTestId('user-modal')).toBeVisible()

    // Change role to manager
    await page.getByTestId('field-role_id').locator('select').selectOption(String(managerRole!.id))

    // Save — modal closes
    await page.getByTestId('user-save').click()
    await expect(page.getByTestId('user-modal')).not.toBeVisible({ timeout: 10_000 })

    // Verify via API
    const after = await getData<{ role: string }>(api, `/api/v1/users/${viewer!.id}`)
    expect(after.role, 'BE should reflect the manager role').toBe('manager')

    // Reset (cleanup) — flip back through the UI as well to exercise the reverse
    await page.getByRole('cell', { name: 'viewer@kadahapola.com', exact: true }).click()
    await expect(page.getByTestId('user-modal')).toBeVisible()
    await page.getByTestId('field-role_id').locator('select').selectOption(String(originalRole!.id))
    await page.getByTestId('user-save').click()
    await expect(page.getByTestId('user-modal')).not.toBeVisible({ timeout: 10_000 })
  })

  test('Roles — create a throwaway role with permissions, then delete', async ({ loggedInPage: page, api }) => {
    const permissions = await getData<Array<{ id: number; resource: string; action: string }>>(api, '/api/v1/permissions')
    const twoPerms = permissions.slice(0, 2)
    expect(twoPerms.length).toBe(2)

    const throwawayName = `e2e-role-${Math.floor(Math.random() * 90000) + 10000}`

    await gotoSection(page, 'admin','roles')
    await page.getByTestId('new-role').click()
    await expect(page.getByTestId('role-modal')).toBeVisible()

    // Fill name + description (raw #id selectors — this modal isn't DocDetailModal)
    await page.locator('#name').fill(throwawayName)
    await page.locator('#description').fill('E2E throwaway')

    // Tick 2 permission checkboxes
    for (const p of twoPerms) {
      await page.getByTestId(`perm-${p.resource}-${p.action}`).check()
    }

    await page.getByTestId('role-save').click()
    await expect(page.getByTestId('role-modal')).not.toBeVisible({ timeout: 10_000 })

    // Verify the role exists with the 2 permissions
    const roles = await getData<Array<{ id: number; name: string }>>(api, '/api/v1/roles')
    const created = roles.find(r => r.name === throwawayName)
    expect(created, 'new role should be listed').toBeTruthy()
    const detail = await getData<{ permissions: Array<{ id: number }> }>(api, `/api/v1/roles/${created!.id}`)
    expect(detail.permissions.length, 'new role should have 2 perms').toBe(2)

    // Delete via UI
    await page.getByRole('cell', { name: throwawayName, exact: true }).click()
    await expect(page.getByTestId('role-modal')).toBeVisible()
    await page.getByTestId('role-delete').click()
    await page.getByTestId('role-delete-confirm').click()
    await expect(page.getByTestId('role-modal')).not.toBeVisible({ timeout: 10_000 })

    // Confirm it's gone
    const after = await getData<Array<{ name: string }>>(api, '/api/v1/roles')
    expect(after.find(r => r.name === throwawayName), 'role should be deleted').toBeFalsy()
  })

  test('Permissions — catalog renders with rows per resource', async ({ loggedInPage: page }) => {
    await gotoSection(page, 'admin','permissions')
    await expect(page.getByTestId('permissions-grid')).toBeVisible()
    // At least one resource group should render
    const groupHeadings = page.locator('[data-testid="permissions-grid"] table')
    await expect(groupHeadings.first()).toBeVisible()
  })
})
