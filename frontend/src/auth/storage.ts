import { KEYCLOAK_TOKEN_STORAGE_KEY } from './config'

export function getStoredAuthToken() {
  return window.localStorage.getItem(KEYCLOAK_TOKEN_STORAGE_KEY)
}

export function setStoredAuthToken(token: string) {
  window.localStorage.setItem(KEYCLOAK_TOKEN_STORAGE_KEY, token)
}

export function clearStoredAuthToken() {
  window.localStorage.removeItem(KEYCLOAK_TOKEN_STORAGE_KEY)
}
