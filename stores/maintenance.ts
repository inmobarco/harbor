import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import {
  buildMaintenanceQuery,
  normalizeMaintenanceAttachment,
  normalizeMaintenanceRequest,
  normalizeMaintenanceStaff,
} from '~/lib/maintenanceMappers'
import { CLOSED_STATUSES, OPEN_STATUSES } from '~/types/maintenance'
import type {
  MaintenanceAttachment,
  MaintenanceFilters,
  MaintenanceRequest,
  MaintenanceStaff,
} from '~/types/maintenance'

/** Tope del endpoint. El tablero trae todas las abiertas en una sola pagina. */
const OPEN_LIMIT = 500
const CLOSED_PAGE_SIZE = 50

function errorMessage(err: any, fallback: string): string {
  return err?.data?.detail || err?.data?.message || err?.message || fallback
}

function emptyFilters(): MaintenanceFilters {
  return { q: '', priority: [], assignee: null, quick: null }
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export const useMaintenanceStore = defineStore('maintenance', () => {
  // ─── State ────────────────────────────────────────────────────────────────
  /** Solicitudes en curso (recibida → resuelta). Se filtran en el cliente. */
  const openRequests = ref<MaintenanceRequest[]>([])
  const openLoading = ref(false)
  const openError = ref<string | null>(null)
  /** Llego una pagina llena: puede haber mas abiertas de las que se muestran. */
  const openTruncated = ref(false)

  /** Cerradas y canceladas: crecen sin limite, se paginan contra el servidor. */
  const closedRequests = ref<MaintenanceRequest[]>([])
  const closedLoading = ref(false)
  const closedError = ref<string | null>(null)
  const closedHasMore = ref(false)

  const staff = ref<MaintenanceStaff[]>([])
  const filters = ref<MaintenanceFilters>(emptyFilters())

  // Evita que una respuesta lenta pise a una mas reciente al cambiar filtros
  let closedSeq = 0

  // ─── Computed ─────────────────────────────────────────────────────────────
  /**
   * La sesion no trae el id del usuario: se busca por nombre en /staff/users.
   * Es el mismo nombre que arma el backend en assigned_user_name.
   */
  const myUserId = computed<number | null>(() => {
    const user = useAuthStore().user
    if (!user) return null
    const myName = fold(`${user.first_name} ${user.last_name}`)
    const matches = staff.value.filter(s => fold(s.name) === myName)
    return matches.length === 1 ? matches[0].id : null
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function requestContext() {
    const config = useRuntimeConfig()
    const authStore = useAuthStore()
    if (!authStore.token) return null
    return {
      base: config.public.apiBaseUrl,
      headers: { Authorization: `Bearer ${authStore.token}` },
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
  async function fetchOpen() {
    const ctx = requestContext()
    if (!ctx) {
      openError.value = 'No hay sesion activa'
      return
    }

    openLoading.value = true
    openError.value = null
    try {
      const data = await $fetch<any[]>(`${ctx.base}/staff/maintenance/requests`, {
        headers: ctx.headers,
        query: buildMaintenanceQuery(OPEN_STATUSES, null, OPEN_LIMIT, 0),
      })
      openRequests.value = data.map(normalizeMaintenanceRequest)
      openTruncated.value = data.length === OPEN_LIMIT
    } catch (err: any) {
      console.error('Error cargando solicitudes de mantenimiento:', err)
      openError.value = errorMessage(err, 'Error al cargar las solicitudes de mantenimiento')
    } finally {
      openLoading.value = false
    }
  }

  /** reset: vuelve a la primera pagina (al cambiar filtros). Si no, agrega la siguiente. */
  async function fetchClosed({ reset }: { reset: boolean }) {
    const ctx = requestContext()
    if (!ctx) {
      closedError.value = 'No hay sesion activa'
      return
    }

    const seq = ++closedSeq
    const offset = reset ? 0 : closedRequests.value.length
    closedLoading.value = true
    closedError.value = null
    try {
      const data = await $fetch<any[]>(`${ctx.base}/staff/maintenance/requests`, {
        headers: ctx.headers,
        query: buildMaintenanceQuery(CLOSED_STATUSES, filters.value, CLOSED_PAGE_SIZE, offset),
      })
      if (seq !== closedSeq) return
      const page = data.map(normalizeMaintenanceRequest)
      closedRequests.value = reset ? page : [...closedRequests.value, ...page]
      closedHasMore.value = data.length === CLOSED_PAGE_SIZE
    } catch (err: any) {
      if (seq !== closedSeq) return
      console.error('Error cargando solicitudes cerradas:', err)
      closedError.value = errorMessage(err, 'Error al cargar las solicitudes cerradas')
    } finally {
      if (seq === closedSeq) closedLoading.value = false
    }
  }

  /** Por ahora solo los managers reciben solicitudes. Se piden una vez por sesion. */
  async function fetchStaff() {
    if (staff.value.length) return
    const ctx = requestContext()
    if (!ctx) return
    try {
      const data = await $fetch<any[]>(`${ctx.base}/staff/users`, {
        headers: ctx.headers,
        params: { roles: 'manager' },
      })
      staff.value = data
        .filter(u => u.is_active !== false)
        .map(normalizeMaintenanceStaff)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    } catch (err) {
      // No bloquea el tablero: solo se pierde el chip "Mias" y los colores
      console.error('Error cargando responsables de mantenimiento:', err)
    }
  }

  function setFilters(patch: Partial<MaintenanceFilters>) {
    filters.value = { ...filters.value, ...patch }
  }

  function resetFilters() {
    filters.value = emptyFilters()
  }

  /**
   * No se cachea: las URL firmadas caducan a los 15 minutos, asi que cada
   * apertura (o renovacion) vuelve a pedirlas.
   */
  async function fetchAttachments(requestId: number): Promise<MaintenanceAttachment[]> {
    const ctx = requestContext()
    if (!ctx) throw new Error('No hay sesion activa')

    try {
      const data = await $fetch<any[]>(
        `${ctx.base}/staff/maintenance/requests/${requestId}/attachments`,
        { headers: ctx.headers },
      )
      return data.map(normalizeMaintenanceAttachment)
    } catch (err: any) {
      console.error('Error cargando adjuntos:', err)
      throw new Error(errorMessage(err, 'Error al cargar los adjuntos'))
    }
  }

  return {
    // State
    openRequests,
    openLoading,
    openError,
    openTruncated,
    closedRequests,
    closedLoading,
    closedError,
    closedHasMore,
    staff,
    filters,
    // Computed
    myUserId,
    // Actions
    fetchOpen,
    fetchClosed,
    fetchStaff,
    setFilters,
    resetFilters,
    fetchAttachments,
  }
})
