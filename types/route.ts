/** Solo admin y manager gestionan el rutero (endpoints /staff/scheduling/*). */
export const ROUTE_MANAGE_ROLES = ['admin', 'manager']

/**
 * La API acepta day_of_week de 1 a 6. Domingo (7) queda fuera:
 * GET /scheduling/routes?today=true devuelve lista vacia ese dia.
 */
export const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miercoles', short: 'Mie' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sabado', short: 'Sab' },
] as const

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6

export function dayLabel(day: number): string {
  return DAYS_OF_WEEK.find(d => d.value === day)?.label ?? `Dia ${day}`
}

export function dayShortLabel(day: number): string {
  return DAYS_OF_WEEK.find(d => d.value === day)?.short ?? `D${day}`
}

/** Conjunto residencial de inventory.residential_complexes. */
export interface ResidentialComplex {
  id: number
  name: string
  address: string | null
}

/**
 * Conjunto dentro de una ruta, en orden de visita.
 * isActive: el detalle de staff incluye conjuntos inactivos a proposito, para
 * que se vea que se cayeron de la ruta. El asesor ya no los recibe.
 */
export interface RouteComplexRef {
  complexId: number
  name: string
  visitOrder: number | null
  address: string | null
  isActive: boolean
}

export interface RouteSummary {
  id: number
  name: string
  notes: string | null
  isActive: boolean
  complexCount: number
  assignmentCount: number
}

export interface RouteDetail extends RouteSummary {
  /** Incluye los inactivos; complexCount (heredado) cuenta solo los activos. */
  complexes: RouteComplexRef[]
}

export interface RouteAssignment {
  /** id de scheduling.route_assignment, el que recibe el DELETE. */
  id: number
  routeId: number
  routeName: string
  advisorId: string
  dayOfWeek: number
  priority: number
}

export interface CreateRoutePayload {
  name: string
  notes: string | null
  complexIds: number[]
}

export interface UpdateRoutePayload {
  name?: string
  notes?: string | null
  complexIds?: number[]
}

export interface CreateAssignmentPayload {
  routeId: number
  advisorId: string
  dayOfWeek: number
  priority: number
}
