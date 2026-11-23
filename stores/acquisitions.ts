import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { normalizeAcquisition, normalizeAdvisor, toLocalIso, weekRange } from '~/lib/acquisitions'
import type { Acquisition, AcquisitionAdvisor, AcquisitionApiRow } from '~/types/acquisition'

const CACHE_TTL = 1000 * 60 * 5 // 5 minutos

function errorMessage(err: any, fallback: string): string {
  const detail = err?.data?.detail
  return (typeof detail === 'string' && detail) || err?.data?.message || fallback
}

export const useAcquisitionsStore = defineStore('acquisitions', () => {
  /** Captaciones desde el lunes de la semana pasada */
  const acquisitions = ref<Acquisition[]>([])
  const roster = ref<AcquisitionAdvisor[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** Momento de la ultima carga: define cual es la "semana actual" */
  const loadedAt = ref(0)

  let inflight: Promise<void> | null = null

  /** Colores y asesores sin captaciones. No es critico: si falla, se sigue sin roster. */
  async function fetchRoster(base: string): Promise<AcquisitionAdvisor[]> {
    try {
      const users = await apiFetch<any[]>(`${base}/staff/users`, {
        params: { roles: 'sales_agent,listing_agent,admin' },
      })
      return users.map(normalizeAdvisor)
    } catch (err) {
      console.warn('No se pudo cargar el roster de asesores:', err)
      return roster.value
    }
  }

  async function runFetch() {
    const base = useRuntimeConfig().public.apiBaseUrl
    const now = new Date()
    const after = toLocalIso(weekRange(-1, now).start)

    loading.value = true
    error.value = null

    try {
      const [rows, users] = await Promise.all([
        apiFetch<AcquisitionApiRow[]>(`${base}/staff/acquisitions`, { params: { after } }),
        fetchRoster(base),
      ])
      acquisitions.value = rows.map(normalizeAcquisition)
      roster.value = users
      loadedAt.value = now.getTime()
    } catch (err: any) {
      console.error('Error cargando captaciones:', err)
      error.value = errorMessage(err, 'Error al cargar las captaciones')
    } finally {
      loading.value = false
    }
  }

  /** Fuerza el fetch, ignorando el cache. */
  async function fetchAcquisitions() {
    if (!useAuthStore().isAuthenticated) {
      error.value = 'No hay sesion activa'
      return
    }
    if (inflight) return inflight
    inflight = runFetch().finally(() => {
      inflight = null
    })
    return inflight
  }

  /** Fetch solo si no hay datos frescos. */
  async function ensureLoaded() {
    if (loadedAt.value && Date.now() - loadedAt.value < CACHE_TTL) return
    return fetchAcquisitions()
  }

  return {
    acquisitions,
    roster,
    loading,
    error,
    loadedAt,
    fetchAcquisitions,
    ensureLoaded,
  }
})
