import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useAgendaStore } from '~/stores/agenda'
import {
  flattenAdvisorRoutes,
  normalizeComplex,
  normalizeRouteDetail,
  normalizeRouteSummary,
} from '~/lib/routeMappers'
import type {
  CreateAssignmentPayload,
  CreateRoutePayload,
  ResidentialComplex,
  RouteAssignment,
  RouteDetail,
  RouteSummary,
  UpdateRoutePayload,
} from '~/types/route'

function errorMessage(err: any, fallback: string): string {
  return err?.data?.detail || err?.data?.message || err?.message || fallback
}

export const useRoutesStore = defineStore('routes', () => {
  // ─── State ────────────────────────────────────────────────────────────────
  const routes = ref<RouteSummary[]>([])
  const routesLoading = ref(false)
  const routesError = ref<string | null>(null)

  const details = ref<Record<number, RouteDetail>>({})
  const detailLoading = ref(false)
  const detailError = ref<string | null>(null)
  const selectedRouteId = ref<number | null>(null)

  const complexes = ref<ResidentialComplex[]>([])
  const complexesLoading = ref(false)
  const complexesError = ref<string | null>(null)

  const assignments = ref<RouteAssignment[]>([])
  const assignmentsLoading = ref(false)
  const assignmentsError = ref<string | null>(null)

  // ─── Computed ─────────────────────────────────────────────────────────────
  const selectedRoute = computed<RouteDetail | null>(() => {
    if (selectedRouteId.value === null) return null
    return details.value[selectedRouteId.value] ?? null
  })

  const assignmentsBySelectedRoute = computed(() => {
    if (selectedRouteId.value === null) return []
    return assignments.value
      .filter(a => a.routeId === selectedRouteId.value)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.priority - b.priority)
  })

  /** Asignaciones de un asesor en un dia, para calcular la priority siguiente. */
  function assignmentsFor(advisorId: string, dayOfWeek: number) {
    return assignments.value
      .filter(a => a.advisorId === advisorId && a.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.priority - b.priority)
  }

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
  async function fetchRoutes() {
    const ctx = requestContext()
    if (!ctx) {
      routesError.value = 'No hay sesion activa'
      return
    }

    routesLoading.value = true
    routesError.value = null
    try {
      const data = await $fetch<any[]>(`${ctx.base}/staff/scheduling/routes`, {
        headers: ctx.headers,
      })
      routes.value = data.map(normalizeRouteSummary)

      // Si la ruta seleccionada desaparecio (borrada en otra sesion), soltarla
      if (selectedRouteId.value !== null && !routes.value.some(r => r.id === selectedRouteId.value)) {
        selectedRouteId.value = null
      }
    } catch (err: any) {
      console.error('Error cargando rutas:', err)
      routesError.value = errorMessage(err, 'Error al cargar las rutas')
    } finally {
      routesLoading.value = false
    }
  }

  async function fetchRoute(routeId: number) {
    const ctx = requestContext()
    if (!ctx) {
      detailError.value = 'No hay sesion activa'
      return
    }

    detailLoading.value = true
    detailError.value = null
    try {
      const data = await $fetch<any>(`${ctx.base}/staff/scheduling/routes/${routeId}`, {
        headers: ctx.headers,
      })
      details.value = { ...details.value, [routeId]: normalizeRouteDetail(data) }
    } catch (err: any) {
      console.error('Error cargando la ruta:', err)
      detailError.value = errorMessage(err, 'Error al cargar el detalle de la ruta')
    } finally {
      detailLoading.value = false
    }
  }

  async function selectRoute(routeId: number | null) {
    selectedRouteId.value = routeId
    if (routeId === null) return
    // Siempre refresca: la composicion se edita desde esta misma vista
    await fetchRoute(routeId)
  }

  async function fetchComplexes() {
    if (complexes.value.length) return
    const ctx = requestContext()
    if (!ctx) {
      complexesError.value = 'No hay sesion activa'
      return
    }

    complexesLoading.value = true
    complexesError.value = null
    try {
      const data = await $fetch<any[]>(`${ctx.base}/inventory/residential-complexes`, {
        headers: ctx.headers,
      })
      complexes.value = data
        .filter(c => c.is_active !== false)
        .map(normalizeComplex)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    } catch (err: any) {
      console.error('Error cargando conjuntos:', err)
      complexesError.value = errorMessage(err, 'Error al cargar los conjuntos residenciales')
    } finally {
      complexesLoading.value = false
    }
  }

  /**
   * No hay endpoint que liste todas las asignaciones, asi que se reconstruyen
   * consultando la agenda de cada asesor. allSettled: un asesor que falle no
   * debe dejar la vista sin las asignaciones de los demas.
   *
   * Ojo: _get_advisor_routes hace INNER JOIN contra conjuntos activos, asi que
   * una ruta sin conjuntos activos no aparece aqui aunque tenga asignaciones
   * vivas. La diferencia contra assignment_count se muestra en el detalle.
   */
  async function fetchAssignments() {
    const ctx = requestContext()
    if (!ctx) {
      assignmentsError.value = 'No hay sesion activa'
      return
    }

    const agendaStore = useAgendaStore()
    if (!agendaStore.advisors.length) await agendaStore.fetchAdvisors()

    assignmentsLoading.value = true
    assignmentsError.value = null
    try {
      const results = await Promise.allSettled(
        agendaStore.advisors.map(async advisor => {
          const data = await $fetch<any>(
            `${ctx.base}/staff/scheduling/advisors/${advisor.id}/routes`,
            { headers: ctx.headers }
          )
          return flattenAdvisorRoutes(data, advisor.id)
        })
      )

      const collected: RouteAssignment[] = []
      let failed = 0
      for (const result of results) {
        if (result.status === 'fulfilled') collected.push(...result.value)
        else failed++
      }

      assignments.value = collected
      assignmentsError.value = failed
        ? `No se pudieron cargar las asignaciones de ${failed} asesor(es)`
        : null
    } catch (err: any) {
      console.error('Error cargando asignaciones:', err)
      assignmentsError.value = errorMessage(err, 'Error al cargar las asignaciones')
    } finally {
      assignmentsLoading.value = false
    }
  }

  async function createRoute(payload: CreateRoutePayload): Promise<RouteDetail> {
    const ctx = requestContext()
    if (!ctx) throw new Error('No hay sesion activa')

    const data = await $fetch<any>(`${ctx.base}/staff/scheduling/routes`, {
      method: 'POST',
      headers: ctx.headers,
      body: {
        name: payload.name,
        notes: payload.notes,
        complex_ids: payload.complexIds,
      },
    })

    const detail = normalizeRouteDetail(data)
    details.value = { ...details.value, [detail.id]: detail }
    await fetchRoutes()
    return detail
  }

  async function updateRoute(routeId: number, payload: UpdateRoutePayload): Promise<RouteDetail> {
    const ctx = requestContext()
    if (!ctx) throw new Error('No hay sesion activa')

    // exclude_unset en el backend: solo enviar lo que realmente cambia
    const body: Record<string, unknown> = {}
    if (payload.name !== undefined) body.name = payload.name
    if (payload.notes !== undefined) body.notes = payload.notes
    if (payload.complexIds !== undefined) body.complex_ids = payload.complexIds

    const data = await $fetch<any>(`${ctx.base}/staff/scheduling/routes/${routeId}`, {
      method: 'PATCH',
      headers: ctx.headers,
      body,
    })

    const detail = normalizeRouteDetail(data)
    details.value = { ...details.value, [detail.id]: detail }
    await fetchRoutes()
    return detail
  }

  async function deleteRoute(routeId: number) {
    const ctx = requestContext()
    if (!ctx) throw new Error('No hay sesion activa')

    await $fetch(`${ctx.base}/staff/scheduling/routes/${routeId}`, {
      method: 'DELETE',
      headers: ctx.headers,
    })

    // El backend desactiva en cascada las asignaciones de la ruta
    assignments.value = assignments.value.filter(a => a.routeId !== routeId)
    const nextDetails = { ...details.value }
    delete nextDetails[routeId]
    details.value = nextDetails
    if (selectedRouteId.value === routeId) selectedRouteId.value = null
    await fetchRoutes()
  }

  async function createAssignment(payload: CreateAssignmentPayload) {
    const ctx = requestContext()
    if (!ctx) throw new Error('No hay sesion activa')

    const data = await $fetch<any>(`${ctx.base}/staff/scheduling/route-assignments`, {
      method: 'POST',
      headers: ctx.headers,
      body: {
        route_id: payload.routeId,
        advisor_id: Number(payload.advisorId),
        day_of_week: payload.dayOfWeek,
        priority: payload.priority,
      },
    })

    assignments.value = [
      ...assignments.value,
      {
        id: Number(data.id),
        routeId: Number(data.route_id),
        routeName: data.route_name,
        advisorId: String(data.advisor_id),
        dayOfWeek: Number(data.day_of_week),
        priority: Number(data.priority),
      },
    ]
    await fetchRoutes()
  }

  async function deleteAssignment(assignmentId: number) {
    const ctx = requestContext()
    if (!ctx) throw new Error('No hay sesion activa')

    await $fetch(`${ctx.base}/staff/scheduling/route-assignments/${assignmentId}`, {
      method: 'DELETE',
      headers: ctx.headers,
    })

    assignments.value = assignments.value.filter(a => a.id !== assignmentId)
    await fetchRoutes()
  }

  return {
    // State
    routes,
    routesLoading,
    routesError,
    details,
    detailLoading,
    detailError,
    selectedRouteId,
    complexes,
    complexesLoading,
    complexesError,
    assignments,
    assignmentsLoading,
    assignmentsError,
    // Computed
    selectedRoute,
    assignmentsBySelectedRoute,
    assignmentsFor,
    // Actions
    fetchRoutes,
    fetchRoute,
    selectRoute,
    fetchComplexes,
    fetchAssignments,
    createRoute,
    updateRoute,
    deleteRoute,
    createAssignment,
    deleteAssignment,
  }
})
