export type AuthMode = 'demo' | 'keycloak'

export const DEMO_USER_STORAGE_KEY = 'pipeline-monitor-demo-user'
export const KEYCLOAK_TOKEN_STORAGE_KEY = 'pipeline-monitor-keycloak-token'

export const AUTH_MODE: AuthMode = import.meta.env.VITE_AUTH_MODE === 'keycloak' ? 'keycloak' : 'demo'

export const KEYCLOAK_CONFIG = {
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'pipeline-monitor',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'pipeline-monitor-web',
}
