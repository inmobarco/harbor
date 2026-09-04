import { defineStore } from 'pinia'
import type { CrmAdvisorOverview, CrmOverviewResponse } from '~/types/crm'
import { useAuthStore } from '~/stores/auth'

const CACHE_TTL = 1000 * 60 * 5 // 5 minutos

export const useCrmStore = defineStore('crm', () => {
  const advisors = ref<CrmAdvisorOverview[]>([])
  const totals = ref<CrmOverviewResponse['totals']>({
    advisors: 0,
    clients: 0,
    active: 0,
    staleOver30d: 0,
  })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loadedAt = ref(0)

  // Dedup de requests en vuelo: el widget y una recarga manual no deben
  // disparar el mismo abanico dos veces
  let inflight: Promise<void> | null = null

  async function runFetch() {
    const authStore = useAuthStore()

    loading.value = true
    error.value = null

    try {
      const data = await $fetch<CrmOverviewResponse>('/api/crm/overview', {
        headers: { Authorization: `Bearer ${authStore.token}` },
      })
      advisors.value = data.advisors
      totals.value = data.totals
      loadedAt.value = Date.now()
    } catch (err: any) {
      console.error('Error cargando resumen CRM:', err)
      error.value =
        err?.data?.statusMessage ||
        err?.data?.message ||
        'Error al cargar el resumen de clientes'
    } finally {
      loading.value = false
    }
  }

  /** Fuerza el fetch, ignorando el cache. */
  async function fetchOverview() {
    const authStore = useAuthStore()
    if (!authStore.token) {
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
    if (advisors.value.length && Date.now() - loadedAt.value < CACHE_TTL) return
    return fetchOverview()
  }

  return {
    advisors,
    totals,
    loading,
    error,
    loadedAt,
    fetchOverview,
    ensureLoaded,
  }
})
