/* eslint-disable react-refresh/only-export-components */
import { startTransition, createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import type { DemoUser, UserRole } from '../api/types'
import { AUTH_MODE, DEMO_USER_STORAGE_KEY, KEYCLOAK_CONFIG, type AuthMode } from './config'
import { clearStoredAuthToken, setStoredAuthToken } from './storage'
import { resolveUserRole } from './roles'

const DEMO_USERS: DemoUser[] = [
  { id: 1, email: 'admin@pipeline.local', displayName: 'Admin', role: 'admin' },
  { id: 2, email: 'operator@pipeline.local', displayName: 'Operator', role: 'operator' },
  { id: 3, email: 'viewer@pipeline.local', displayName: 'Viewer', role: 'viewer' },
]

const FALLBACK_KEYCLOAK_USER: DemoUser = {
  id: 0,
  email: 'keycloak@pipeline.local',
  displayName: 'Keycloak user',
  role: 'viewer',
}

interface KeycloakClaims {
  email?: string
  preferred_username?: string
  name?: string
  realm_access?: {
    roles?: string[]
  }
}

interface AuthContextValue {
  authMode: AuthMode
  currentUser: DemoUser
  users: DemoUser[]
  isLoading: boolean
  setCurrentUserId: (userId: number) => void
  can: (...roles: UserRole[]) => boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function mapKeycloakClaimsToUser(tokenParsed: KeycloakClaims | undefined): DemoUser {
  const roles = tokenParsed?.realm_access?.roles ?? []
  return {
    id: 0,
    email: tokenParsed?.email ?? 'keycloak@pipeline.local',
    displayName: tokenParsed?.preferred_username ?? tokenParsed?.name ?? 'Keycloak user',
    role: resolveUserRole(roles),
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [currentUserId, setCurrentUserIdState] = useState<number>(() => {
    const storedValue = window.localStorage.getItem(DEMO_USER_STORAGE_KEY)
    return storedValue ? Number(storedValue) : DEMO_USERS[0].id
  })
  const [keycloakUser, setKeycloakUser] = useState<DemoUser>(FALLBACK_KEYCLOAK_USER)
  const [isLoading, setIsLoading] = useState(AUTH_MODE === 'keycloak')
  const [logoutHandler, setLogoutHandler] = useState<() => Promise<void>>(() => async () => undefined)

  useEffect(() => {
    if (AUTH_MODE !== 'demo') {
      return
    }

    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, String(currentUserId))
  }, [currentUserId])

  useEffect(() => {
    if (AUTH_MODE !== 'keycloak') {
      clearStoredAuthToken()
      return
    }

    let active = true

    async function initializeKeycloak() {
      try {
        const { default: Keycloak } = await import('keycloak-js')
        const keycloak = new Keycloak(KEYCLOAK_CONFIG)
        const authenticated = await keycloak.init({
          onLoad: 'login-required',
          pkceMethod: 'S256',
          checkLoginIframe: false,
        })

        if (!authenticated) {
          await keycloak.login()
          return
        }

        if (!active) {
          return
        }

        if (keycloak.token) {
          setStoredAuthToken(keycloak.token)
        }

        setKeycloakUser(mapKeycloakClaimsToUser(keycloak.tokenParsed as KeycloakClaims | undefined))
        setLogoutHandler(() => async () => {
          clearStoredAuthToken()
          await keycloak.logout({ redirectUri: window.location.origin })
        })
        keycloak.onAuthRefreshSuccess = () => {
          if (keycloak.token) {
            setStoredAuthToken(keycloak.token)
          }
        }
        keycloak.onTokenExpired = () => {
          void keycloak.updateToken(30)
        }
      } catch (error) {
        console.error('Failed to initialize Keycloak auth mode.', error)
        clearStoredAuthToken()
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void initializeKeycloak()

    return () => {
      active = false
    }
  }, [])

  const currentUser = AUTH_MODE === 'keycloak' ? keycloakUser : DEMO_USERS.find((user) => user.id === currentUserId) ?? DEMO_USERS[0]

  const value = useMemo<AuthContextValue>(
    () => ({
      authMode: AUTH_MODE,
      currentUser,
      users: AUTH_MODE === 'demo' ? DEMO_USERS : [],
      isLoading,
      setCurrentUserId: (userId: number) => {
        if (AUTH_MODE !== 'demo') {
          return
        }

        startTransition(() => {
          setCurrentUserIdState(userId)
        })
      },
      can: (...roles: UserRole[]) => roles.includes(currentUser.role),
      logout: logoutHandler,
    }),
    [currentUser, isLoading, logoutHandler],
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
