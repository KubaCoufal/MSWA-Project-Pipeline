import { KEYCLOAK_TOKEN_STORAGE_KEY } from './config'

let authToken: string | null = null

export function getStoredAuthToken() {
  return authToken
}

export function setStoredAuthToken(token: string) {
  authToken = token
}

export function clearStoredAuthToken() {
  authToken = null
  window.localStorage.removeItem(KEYCLOAK_TOKEN_STORAGE_KEY)
}
