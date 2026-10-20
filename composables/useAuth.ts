import type { LoginPayload, LoginResponse } from '~/types/auth'

/** Ej: "Harbor Web · Chrome en Windows". Identifica la sesion en auth.refresh_token. */
function deviceLabel(): string {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Navegador'
  const os = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : null
  return `Harbor Web · ${browser}${os ? ` en ${os}` : ''}`
}

export function useAuth() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const router = useRouter()

  const loading = ref(false)
  const error = ref<string | null>(null)

  async function login(payload: LoginPayload) {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<LoginResponse>(`${config.public.apiBaseUrl}/login`, {
        method: 'POST',
        body: { ...payload, device_label: deviceLabel() },
      })

      authStore.setSession(data.access_token, data.refresh_token ?? null, {
        id: data.id,
        username: data.username,
        role: data.role,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      })

      await router.push('/')
    } catch (e: any) {
      error.value = e?.data?.detail || 'Error al iniciar sesión'
    } finally {
      loading.value = false
    }
  }

  /** Revoca el refresh token en la API. La sesion local se borra siempre, aunque no haya red. */
  function logout() {
    const refreshToken = authStore.refreshToken
    authStore.clearSession()
    router.push('/login')

    if (refreshToken) {
      $fetch(`${config.public.apiBaseUrl}/auth/logout`, {
        method: 'POST',
        body: { refresh_token: refreshToken },
      }).catch(() => {})
    }
  }

  return { login, logout, loading, error }
}
