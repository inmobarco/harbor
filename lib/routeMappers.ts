import type {
  ResidentialComplex,
  RouteAssignment,
  ScheduleDay,
  ScheduledComplex,
  ScheduledRoute,
  RouteComplexRef,
  RouteDetail,
  RouteSummary,
} from '~/types/route'

/**
 * Mapeo de las respuestas de /staff/scheduling/* y /inventory a los tipos de
 * la app. Aisladas del store para poder ejercitarlas sin Nuxt ni Pinia.
 */

/** Fila de _fetch_route_complexes: ya viene ordenada por visit_order. */
export function normalizeComplexRef(raw: any): RouteComplexRef {
  return {
    complexId: Number(raw.complex_id),
    name: raw.name,
    visitOrder: raw.visit_order != null ? Number(raw.visit_order) : null,
    address: raw.address ?? null,
    isActive: raw.is_active !== false,
  }
}

export function normalizeRouteSummary(raw: any): RouteSummary {
  return {
    id: Number(raw.id),
    name: raw.name,
    notes: raw.notes ?? null,
    isActive: raw.is_active !== false,
    complexCount: Number(raw.complex_count ?? 0),
    assignmentCount: Number(raw.assignment_count ?? 0),
  }
}

export function normalizeRouteDetail(raw: any): RouteDetail {
  // El backend ya aplica ORDER BY visit_order NULLS LAST, rc.id
  const complexes: RouteComplexRef[] = (raw.complexes ?? []).map(normalizeComplexRef)

  return {
    ...normalizeRouteSummary(raw),
    // staff_get_route no devuelve complex_count. Se recalcula con la misma
    // semantica del listado: solo conjuntos activos.
    complexCount: complexes.filter(c => c.isActive).length,
    complexes,
  }
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeScheduledComplex(raw: any): ScheduledComplex {
  return {
    complexId: Number(raw.complex_id),
    name: raw.name ?? `Conjunto ${raw.complex_id}`,
    address: raw.address ?? null,
    latitude: toNumberOrNull(raw.latitude),
    longitude: toNumberOrNull(raw.longitude),
    visitOrder: toNumberOrNull(raw.visit_order),
    checkInId: toNumberOrNull(raw.check_in_id),
    visitedAt: raw.visited_at ?? null,
  }
}

function normalizeScheduledRoute(raw: any): ScheduledRoute {
  return {
    assignmentId: Number(raw.assignment_id),
    routeId: Number(raw.route_id),
    routeName: raw.route_name,
    notes: raw.notes ?? null,
    priority: Number(raw.priority ?? 0),
    complexes: (raw.complexes ?? []).map(normalizeScheduledComplex),
  }
}

/**
 * Agenda de la semana actual de un asesor: [{ day_of_week, date, routes }].
 * El backend ya ordena dias, rutas (priority) y conjuntos (visit_order).
 */
export function normalizeAdvisorWeek(payload: any): ScheduleDay[] {
  const days = Array.isArray(payload) ? payload : []
  return days.map(day => ({
    dayOfWeek: Number(day.day_of_week),
    date: String(day.date ?? ''),
    routes: (day?.routes ?? []).map(normalizeScheduledRoute),
  }))
}

/** Aplana la agenda a una fila por asignacion, que es como la gestion las muestra. */
export function flattenAdvisorWeek(days: ScheduleDay[], advisorId: string): RouteAssignment[] {
  const out: RouteAssignment[] = []
  for (const day of days) {
    for (const route of day.routes) {
      out.push({
        id: route.assignmentId,
        routeId: route.routeId,
        routeName: route.routeName,
        advisorId,
        dayOfWeek: day.dayOfWeek,
        priority: route.priority,
      })
    }
  }
  return out
}

/** Fila de GET /inventory/residential-complexes (SELECT *). */
export function normalizeComplex(raw: any): ResidentialComplex {
  return {
    id: Number(raw.id),
    name: raw.name ?? `Conjunto ${raw.id}`,
    address: raw.address ?? null,
  }
}
