import { defineStore } from 'pinia'
import type { RefreshResponse, User } from '~/types/auth'

const TOKEN_KEY = 'harbor_token'
const REFRESH_KEY = 'harbor_refresh_token'
const USER_KEY = 'harbor_user'

/** Claves de la sesion en localStorage, para sincronizar pestañas. */
export const AUTH_STORAGE_KEYS: readonly string[] = [TOKEN_KEY, REFRESH_KEY, USER_KEY]

/** Lock compartido entre pestañas: el refresh token rota y solo una puede canjearlo. */
const REFRESH_LOCK = 'harbor-auth-refresh'

function readUser(): User | null {
  try {
    const saved = localStorage.getItem(USER_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(REFRESH_LOCK, fn) as Promise<T>
  }
  return fn()
}

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()

  // ssr: false → localStorage existe al crear el store
  const user = ref<User | null>(readUser())
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_KEY))

  // Sesiones previas a la rotacion solo tienen access token: siguen validas
  // hasta que venza, y ahi se manda al login porque no hay con que renovar.
  const isAuthenticated = computed(() => !!(refreshToken.value || token.value))

  // Refresh en vuelo dentro de esta pestaña: los 401 simultaneos lo comparten
  let refreshing: Promise<string | null> | null = null

  function setTokens(access: string, refresh: string | null) {
    token.value = access
    refreshToken.value = refresh
    localStorage.setItem(TOKEN_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
    else localStorage.removeItem(REFRESH_KEY)
  }

  function setSession(access: string, refresh: string | null, newUser: User) {
    setTokens(access, refresh)
    user.value = newUser
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
  }

  function clearSession() {
    token.value = null
    refreshToken.value = null
    user.value = null
    for (const key of AUTH_STORAGE_KEYS) localStorage.removeItem(key)
  }

  /** Relee la sesion de localStorage (otra pestaña pudo renovarla o cerrarla). */
  function loadSession() {
    token.value = localStorage.getItem(TOKEN_KEY)
    refreshToken.value = localStorage.getItem(REFRESH_KEY)
    user.value = readUser()
  }

  async function runRefresh(failedToken: string | null): Promise<string | null> {
    loadSession()
    // Otro request u otra pestaña ya lo renovo mientras se esperaba el lock
    if (token.value && token.value !== failedToken) return token.value
    if (!refreshToken.value) {
      clearSession()
      return null
    }

    try {
      // $fetch directo, sin apiFetch: el refresh no debe pasar por el interceptor
      const data = await $fetch<RefreshResponse>(`${config.public.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        body: { refresh_token: refreshToken.value },
      })
      setTokens(data.access_token, data.refresh_token)
      return data.access_token
    } catch (err: any) {
      // refresh_invalid: vencido, revocado o usuario desactivado
      if ((err?.response?.status ?? err?.statusCode) === 401) {
        clearSession()
        return null
      }
      // Error de red o del servidor: se conserva la sesion para reintentar despues
      throw err
    }
  }

  /**
   * Canjea el refresh token por un par nuevo. `failedToken` es el access token
   * con el que salio el request que recibio token_expired. Devuelve el access
   * token vigente, o null si la sesion termino (y ya quedo limpia).
   */
  function refreshAccessToken(failedToken: string | null): Promise<string | null> {
    if (!refreshing) {
      refreshing = withRefreshLock(() => runRefresh(failedToken)).finally(() => {
        refreshing = null
      })
    }
    return refreshing
  }

  return {
    user,
    token,
    refreshToken,
    isAuthenticated,
    setSession,
    clearSession,
    loadSession,
    refreshAccessToken,
  }
})
