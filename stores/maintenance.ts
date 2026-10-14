import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import {
  buildMaintenanceQuery,
  normalizeMaintenanceAttachment,
  normalizeMaintenanceEvent,
  normalizeMaintenanceRequest,
  normalizeMaintenanceRequestDetail,
  normalizeMaintenanceStaff,
} from '~/lib/maintenanceMappers'
import { CLOSED_STATUSES, OPEN_STATUSES } from '~/types/maintenance'
import type {
  MaintenanceAttachment,
  MaintenanceEvent,
  MaintenanceFilters,
  MaintenanceRequest,
  MaintenanceRequestDetail,
  MaintenanceRequestUpdate,
  MaintenanceStaff,
  MaintenanceStatus,
} from '~/types/maintenance'

/** Tope del endpoint. El tablero trae todas las abiertas en una sola pagina. */
const OPEN_LIMIT = 500
const CLOSED_PAGE_SIZE = 50

function errorMessage(err: any, fallback: string): string {
  const detail = err?.data?.detail
  // Errores de validacion de FastAPI: [{ loc, msg, type }, ...]
  if (Array.isArray(detail)) return detail.map(d => d?.msg).filter(Boolean).join('. ') || fallback
  return (typeof detail === 'string' && detail) || err?.data?.message || err?.message || fallback
}

function emptyFilters(): MaintenanceFilters {
  return { q: '', priority: [], assignee: null, city: null, quick: null }
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
   * id del usuario en sesion. Las sesiones iniciadas antes de que el login
   * devolviera el id no lo tienen: en ese caso se busca por nombre en
   * /staff/users (es el mismo nombre que arma el backend en assigned_user_name).
   */
  const myUserId = computed<number | null>(() => {
    const user = useAuthStore().user
    if (!user) return null
    if (typeof user.id === 'number') return user.id
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

  /** Detalle con datos personales: no se guarda en el store, solo lo usa el panel. */
  async function fetchDetail(requestId: number): Promise<MaintenanceRequestDetail> {
    const ctx = requestContext()
    if (!ctx) throw new Error('No hay sesion activa')

    try {
      const data = await $fetch<any>(`${ctx.base}/staff/maintenance/requests/${requestId}`, {
        headers: ctx.headers,
      })
      return normalizeMaintenanceRequestDetail(data)
    } catch (err: any) {
      console.error('Error cargando el detalle de la solicitud:', err)
      throw new Error(errorMessage(err, 'Error al cargar el detalle de la solicitud'))
    }
  }

  /** Bitacora en orden cronologico (la mas antigua primero), como la entrega el backend. */
  async function fetchEvents(requestId: number): Promise<MaintenanceEvent[]> {
    const ctx = requestContext()
    if (!ctx) throw new Error('No hay sesion activa')

    try {
      const data = await $fetch<any[]>(`${ctx.base}/staff/maintenance/requests/${requestId}/events`, {
        headers: ctx.headers,
      })
      return data.map(normalizeMaintenanceEvent)
    } catch (err: any) {
      console.error('Error cargando la bitacora:', err)
      throw new Error(errorMessage(err, 'Error al cargar la bitacora'))
    }
  }

  /**
   * Las listas guardan solo los campos del listado: los datos personales del
   * detalle (documento, correo, consentimiento) se quedan en el panel.
   */
  function toListRow(d: MaintenanceRequestDetail): MaintenanceRequest {
    const {
      submissionId, reporterDocument, reporterEmail, categoryId, subcategoryId, description,
      availableDays, timeSlot, availabilityNotes, archivePrefix, consentAccepted,
      consentPolicyVersion, consentAcceptedAt, consentIp, consentUserAgent, rawPayload,
      ...row
    } = d
    return row
  }

  /**
   * Coloca la version que devolvio el PATCH en la lista que le corresponde.
   * Al pasar a cerrada o cancelada sale del tablero y entra a las cerradas.
   */
  function replaceRequest(updated: MaintenanceRequest) {
    const isClosed = CLOSED_STATUSES.includes(updated.status as MaintenanceStatus)
    const withoutOpen = openRequests.value.filter(r => r.id !== updated.id)
    const withoutClosed = closedRequests.value.filter(r => r.id !== updated.id)
    openRequests.value = isClosed ? withoutOpen : [updated, ...withoutOpen]
    closedRequests.value = isClosed ? [updated, ...withoutClosed] : withoutClosed
  }

  /**
   * PATCH de estado, prioridad, quien paga, responsable o marca de revision.
   * El backend deja el evento en la bitacora en la misma transaccion y devuelve
   * la solicitud completa (misma forma que el detalle), que sirve para la
   * tarjeta y para el panel. Lanza el error con el mensaje del backend.
   */
  async function updateRequest(
    requestId: number,
    payload: MaintenanceRequestUpdate,
  ): Promise<MaintenanceRequestDetail> {
    const ctx = requestContext()
    if (!ctx) throw new Error('No hay sesion activa')

    try {
      const data = await $fetch<any>(`${ctx.base}/staff/maintenance/requests/${requestId}`, {
        method: 'PATCH',
        headers: ctx.headers,
        body: payload,
      })
      const updated = normalizeMaintenanceRequestDetail(data)
      replaceRequest(toListRow(updated))
      return updated
    } catch (err: any) {
      console.error('Error actualizando la solicitud:', err)
      throw new Error(errorMessage(err, 'No se pudo actualizar la solicitud'))
    }
  }

  /** Las notas son inmutables. Se permiten tambien en cerradas y canceladas. */
  async function addNote(requestId: number, note: string): Promise<MaintenanceEvent> {
    const ctx = requestContext()
    if (!ctx) throw new Error('No hay sesion activa')

    try {
      const data = await $fetch<any>(`${ctx.base}/staff/maintenance/requests/${requestId}/notes`, {
        method: 'POST',
        headers: ctx.headers,
        body: { note },
      })
      return normalizeMaintenanceEvent(data)
    } catch (err: any) {
      console.error('Error agregando la nota:', err)
      throw new Error(errorMessage(err, 'No se pudo agregar la nota'))
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
    fetchDetail,
    fetchEvents,
    updateRequest,
    addNote,
  }
})
