import type { LoginPayload, LoginResponse } from '~/types/auth'

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
        body: payload,
      })

      authStore.setSession(data.access_token, {
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

  function logout() {
    authStore.clearSession()
    router.push('/login')
  }

  return { login, logout, loading, error }
}
