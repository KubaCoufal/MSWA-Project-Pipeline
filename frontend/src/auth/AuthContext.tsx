/* eslint-disable react-refresh/only-export-components */
import { startTransition, createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import type { DemoUser, UserRole } from '../api/types'

const DEMO_USERS: DemoUser[] = [
  { id: 1, email: 'admin@pipeline.local', displayName: 'Admin', role: 'admin' },
  { id: 2, email: 'operator@pipeline.local', displayName: 'Operator', role: 'operator' },
  { id: 3, email: 'viewer@pipeline.local', displayName: 'Viewer', role: 'viewer' },
]

const STORAGE_KEY = 'pipeline-monitor-demo-user'

interface AuthContextValue {
  currentUser: DemoUser
  users: DemoUser[]
  setCurrentUserId: (userId: number) => void
  can: (...roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [currentUserId, setCurrentUserIdState] = useState<number>(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    return storedValue ? Number(storedValue) : DEMO_USERS[0].id
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(currentUserId))
  }, [currentUserId])

  const currentUser = DEMO_USERS.find((user) => user.id === currentUserId) ?? DEMO_USERS[0]

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      users: DEMO_USERS,
      setCurrentUserId: (userId: number) => {
        startTransition(() => {
          setCurrentUserIdState(userId)
        })
      },
      can: (...roles: UserRole[]) => roles.includes(currentUser.role),
    }),
    [currentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return context
}
