import { AUTH_STORAGE_KEYS } from '~/stores/auth'

/**
 * Mantiene la sesion coherente en toda la app:
 * - Si la sesion termina (logout, refresh_invalid, token_invalid) manda al login.
 * - Si otra pestaña renueva o cierra la sesion, esta se entera por el evento storage.
 */
export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  const router = useRouter()

  window.addEventListener('storage', (event) => {
    // key null: localStorage.clear() en otra pestaña
    if (event.key === null || AUTH_STORAGE_KEYS.includes(event.key)) authStore.loadSession()
  })

  watch(
    () => authStore.isAuthenticated,
    (isAuthenticated) => {
      if (!isAuthenticated && router.currentRoute.value.path !== '/login') router.push('/login')
    }
  )
})
