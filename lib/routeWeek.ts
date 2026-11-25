import { DAYS_OF_WEEK } from '~/types/route'
import type { ScheduleDay, ScheduledComplex, ScheduledRoute, VisitStatus } from '~/types/route'
import type { Advisor } from '~/types/advisor'

/**
 * Reglas del tablero semanal del rutero: fechas en hora Colombia, estado de
 * cada visita y avance. Funciones puras (reciben `now`) para probarlas sin Nuxt.
 */

export const COLOMBIA_TZ = 'America/Bogota'

const DAY_MS = 86_400_000

/** Fecha YYYY-MM-DD en hora Colombia. */
export function colombiaDate(now: Date | number): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function parseYmd(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function formatYmd(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10)
}

/** Dia ISO (1 = lunes ... 7 = domingo) de una fecha YYYY-MM-DD. */
export function isoDayOfWeek(ymd: string): number {
  return new Date(parseYmd(ymd)).getUTCDay() || 7
}

/**
 * Fechas de lunes a sabado de la semana actual en Colombia. El domingo cuenta
 * como el cierre de la semana que empezo el lunes anterior.
 */
export function currentWeekDates(now: Date | number): Record<number, string> {
  const today = colombiaDate(now)
  const monday = parseYmd(today) - (isoDayOfWeek(today) - 1) * DAY_MS
  const out: Record<number, string> = {}
  for (const day of DAYS_OF_WEEK) {
    out[day.value] = formatYmd(monday + (day.value - 1) * DAY_MS)
  }
  return out
}

/**
 * visitado: tiene check-in. Sin check-in, el dia de hoy o uno futuro queda
 * pendiente; un dia pasado ya no se puede marcar (el check-in solo se acepta
 * el mismo dia asignado).
 */
export function visitStatus(complex: ScheduledComplex, date: string, today: string): VisitStatus {
  if (complex.visitedAt) return 'visited'
  return date >= today ? 'pending' : 'missed'
}

export interface Progress {
  visited: number
  total: number
  /** Solo cuenta en dias que ya pasaron. */
  missed: number
}

export function routeProgress(route: ScheduledRoute, date: string, today: string): Progress {
  let visited = 0
  let missed = 0
  for (const complex of route.complexes) {
    const status = visitStatus(complex, date, today)
    if (status === 'visited') visited++
    else if (status === 'missed') missed++
  }
  return { visited, total: route.complexes.length, missed }
}

/** Fila del tablero semanal: un asesor con su agenda indexada por dia (1-6). */
export interface WeekBoardRow {
  advisor: Advisor
  days: Record<number, ScheduleDay | undefined>
  progress: Progress
  failed: boolean
}

export function sumProgress(items: Progress[]): Progress {
  return items.reduce(
    (acc, p) => ({ visited: acc.visited + p.visited, total: acc.total + p.total, missed: acc.missed + p.missed }),
    { visited: 0, total: 0, missed: 0 },
  )
}

export function dayProgress(day: ScheduleDay, today: string): Progress {
  return sumProgress(day.routes.map(r => routeProgress(r, day.date, today)))
}

export function weekProgress(days: ScheduleDay[], today: string): Progress {
  return sumProgress(days.map(d => dayProgress(d, today)))
}

export function percent(p: Progress): number {
  return p.total ? Math.round((p.visited / p.total) * 100) : 0
}

/** Hora del check-in (UTC en la API) en hora Colombia, p. ej. "11:13 a. m.". */
export function formatVisitTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA_TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** "25 nov" a partir de YYYY-MM-DD, sin depender de la zona del navegador. */
export function formatShortDate(ymd: string): string {
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'short' })
    .format(new Date(parseYmd(ymd)))
    .replace('.', '')
}
