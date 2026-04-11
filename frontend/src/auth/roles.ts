import type { UserRole } from '../api/types'

const ROLE_PRIORITY: Array<{ appRole: UserRole; aliases: string[] }> = [
  { appRole: 'admin', aliases: ['pipeline-admin', 'admin'] },
  { appRole: 'operator', aliases: ['pipeline-operator', 'operator'] },
  { appRole: 'viewer', aliases: ['pipeline-viewer', 'viewer'] },
]

export function resolveUserRole(roles: string[]): UserRole {
  for (const { appRole, aliases } of ROLE_PRIORITY) {
    if (aliases.some((alias) => roles.includes(alias))) {
      return appRole
    }
  }

  return 'viewer'
}
