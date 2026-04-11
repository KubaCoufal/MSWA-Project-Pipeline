import { resolveUserRole } from '../auth/roles'

test('resolveUserRole prefers admin aliases', () => {
  expect(resolveUserRole(['pipeline-viewer', 'pipeline-admin'])).toBe('admin')
})

test('resolveUserRole falls back to viewer when no aliases match', () => {
  expect(resolveUserRole(['offline_access'])).toBe('viewer')
})
