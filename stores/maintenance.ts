import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { buildMaintenanceQuery, normalizeMaintenanceRequest } from '~/lib/maintenanceMappers'
import type { MaintenanceFilters, MaintenanceRequest } from '~/types/maintenance'

const PAGE_SIZE = 100

function errorMessage(err: any, fallback: string): string {
  return err?.data?.detail || err?.data?.message || err?.message || fallback
}

function emptyFilters(): MaintenanceFilters {
  return { status: [], priority: [], q: '', needsReview: false, unassigned: false }
}

export const useMaintenanceStore = defineStore('maintenance', () => {
  // ─── State ────────────────────────────────────────────────────────────────
  const requests = ref<MaintenanceRequest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<MaintenanceFilters>(emptyFilters())
  const offset = ref(0)
  /** El endpoint no devuelve total: si llega una pagina llena, puede haber mas. */
  const hasMore = ref(false)

  // Evita que una respuesta lenta pise a una mas reciente al teclear en la busqueda
  let requestSeq = 0

  // ─── Actions ──────────────────────────────────────────────────────────────
  async function fetchRequests() {
    const config = useRuntimeConfig()
    const authStore = useAuthStore()
    if (!authStore.token) {
      error.value = 'No hay sesion activa'
      return
    }

    const seq = ++requestSeq
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<any[]>(`${config.public.apiBaseUrl}/staff/maintenance/requests`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
        query: buildMaintenanceQuery(filters.value, PAGE_SIZE, offset.value),
      })
      if (seq !== requestSeq) return
      requests.value = data.map(normalizeMaintenanceRequest)
      hasMore.value = data.length === PAGE_SIZE
    } catch (err: any) {
      if (seq !== requestSeq) return
      console.error('Error cargando solicitudes de mantenimiento:', err)
      error.value = errorMessage(err, 'Error al cargar las solicitudes de mantenimiento')
    } finally {
      if (seq === requestSeq) loading.value = false
    }
  }

  /** Cambiar filtros siempre vuelve a la primera pagina. */
  async function setFilters(patch: Partial<MaintenanceFilters>) {
    filters.value = { ...filters.value, ...patch }
    offset.value = 0
    await fetchRequests()
  }

  async function resetFilters() {
    filters.value = emptyFilters()
    offset.value = 0
    await fetchRequests()
  }

  async function nextPage() {
    if (!hasMore.value) return
    offset.value += PAGE_SIZE
    await fetchRequests()
  }

  async function prevPage() {
    if (offset.value === 0) return
    offset.value = Math.max(0, offset.value - PAGE_SIZE)
    await fetchRequests()
  }

  return {
    // State
    requests,
    loading,
    error,
    filters,
    offset,
    hasMore,
    pageSize: PAGE_SIZE,
    // Actions
    fetchRequests,
    setFilters,
    resetFilters,
    nextPage,
    prevPage,
  }
})
