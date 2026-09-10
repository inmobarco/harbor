import type {
  ResidentialComplex,
  RouteAssignment,
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

/**
 * _get_advisor_routes agrupa por dia: [{ day_of_week, routes: [...] }].
 * Aqui se aplana a una fila por asignacion, que es como la vista las muestra.
 */
export function flattenAdvisorRoutes(payload: any, advisorId: string): RouteAssignment[] {
  const days = Array.isArray(payload) ? payload : []
  const out: RouteAssignment[] = []

  for (const day of days) {
    for (const route of day?.routes ?? []) {
      out.push({
        id: Number(route.assignment_id),
        routeId: Number(route.route_id),
        routeName: route.route_name,
        advisorId,
        dayOfWeek: Number(day.day_of_week),
        priority: Number(route.priority ?? 0),
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
