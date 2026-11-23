import {
  ageHours, compareDefault, dueAt, formatRemaining, humanize, locationLabel, remainingHours,
  slaState,
} from '~/lib/maintenanceView'
import {
  MAINTENANCE_PRIORITIES, OPEN_STATUSES, SLA_HOURS, priorityLabel, responsiblePartyLabel,
  statusLabel,
} from '~/types/maintenance'
import type { MaintenanceRequest } from '~/types/maintenance'

/**
 * Informe Excel de mantenimiento para gerencia. Funciones puras (reciben
 * `now` y los datos ya cargados) para poder probarlas sin Nuxt ni Pinia.
 *
 * Tres hojas:
 *   Resumen                   indicadores de las activas y de la semana anterior
 *   Activas                   detalle de lo que sigue abierto, por vencimiento
 *   Cerradas semana anterior  cerradas y canceladas de lunes a domingo
 */

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

// ─── Periodo ────────────────────────────────────────────────────────────────

/**
 * Semana calendario anterior, de lunes 00:00 a lunes 00:00 (exclusivo), en
 * hora local. Generado un lunes, cubre de lunes a domingo de la semana pasada.
 */
export function previousWeekRange(now: Date): { start: Date; end: Date } {
  const sinceMonday = (now.getDay() + 6) % 7
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday)
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7)
  return { start, end }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatDay(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function formatDateTime(d: Date): string {
  return `${formatDay(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "lunes 17/11/2026 al domingo 23/11/2026" */
export function weekLabel(range: { start: Date; end: Date }): string {
  const lastDay = new Date(range.end.getTime() - DAY_MS)
  return `lunes ${formatDay(range.start)} al domingo ${formatDay(lastDay)}`
}

// ─── Calculos ───────────────────────────────────────────────────────────────

function receivedAt(r: MaintenanceRequest): number {
  const t = Date.parse(r.submittedAt ?? r.createdAt)
  return Number.isNaN(t) ? 0 : t
}

function closedAtMs(r: MaintenanceRequest): number | null {
  if (!r.closedAt) return null
  const t = Date.parse(r.closedAt)
  return Number.isNaN(t) ? null : t
}

/** Cerrada o cancelada dentro de [start, end). */
export function closedInRange(r: MaintenanceRequest, range: { start: Date; end: Date }): boolean {
  const t = closedAtMs(r)
  return t !== null && t >= range.start.getTime() && t < range.end.getTime()
}

/** Dias desde la recepcion hasta el cierre. */
export function daysToClose(r: MaintenanceRequest): number | null {
  const t = closedAtMs(r)
  return t === null ? null : Math.max(0, (t - receivedAt(r)) / DAY_MS)
}

/**
 * Si una cerrada cumplio su plazo. Se mide de la recepcion al cierre, asi que
 * incluye la espera de confirmacion del cliente. null si no aplica (cancelada,
 * prioridad desconocida o sin fecha de cierre).
 */
export function closedWithinSla(r: MaintenanceRequest): boolean | null {
  if (r.status !== 'cerrada') return null
  const limit = SLA_HOURS[r.priority as keyof typeof SLA_HOURS]
  const t = closedAtMs(r)
  if (limit === undefined || t === null) return null
  return t <= receivedAt(r) + limit * HOUR_MS
}

export const AGE_BUCKETS = [
  { label: '0 a 2 dias', maxDays: 3 },
  { label: '3 a 5 dias', maxDays: 6 },
  { label: '6 a 10 dias', maxDays: 11 },
  { label: '11 a 30 dias', maxDays: 31 },
  { label: 'Mas de 30 dias', maxDays: Infinity },
] as const

/** Rango de antiguedad por dias completos desde la recepcion. */
export function ageBucket(r: MaintenanceRequest, now: number): string {
  const days = Math.floor(ageHours(r, now) / 24)
  return AGE_BUCKETS.find(b => days < b.maxDays)!.label
}

function isLate(r: MaintenanceRequest, now: number): boolean {
  return slaState(r, now) === 'late'
}

/** Vence en menos de 24 h y todavia no ha vencido. */
function dueSoon(r: MaintenanceRequest, now: number): boolean {
  const h = remainingHours(r, now)
  return h !== null && h >= 0 && h < 24
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

function ratio(part: number, total: number): number | null {
  return total ? part / total : null
}

export interface GroupRow {
  label: string
  total: number
  late: number
}

/** Agrupa las activas por una clave, con cuantas estan vencidas en cada grupo. */
function groupActive(
  active: MaintenanceRequest[],
  now: number,
  keyOf: (r: MaintenanceRequest) => string,
): GroupRow[] {
  const map = new Map<string, GroupRow>()
  for (const r of active) {
    const label = keyOf(r)
    const row = map.get(label) ?? { label, total: 0, late: 0 }
    row.total++
    if (isLate(r, now)) row.late++
    map.set(label, row)
  }
  return [...map.values()]
}

export interface ReportSummary {
  activeTotal: number
  late: number
  dueSoon: number
  unassigned: number
  urgent: number
  needsReview: number
  byStatus: GroupRow[]
  byPriority: GroupRow[]
  byAssignee: GroupRow[]
  byCity: GroupRow[]
  byAge: { label: string; total: number }[]
  closed: number
  cancelled: number
  closedWithinSla: number
  /** Cerradas con plazo evaluable (excluye prioridad desconocida). */
  closedEvaluable: number
  avgDaysToClose: number | null
  closedByPriority: { label: string; closed: number; withinSla: number; avgDays: number | null }[]
}

export function summarize(
  active: MaintenanceRequest[],
  closedWeek: MaintenanceRequest[],
  now: number,
): ReportSummary {
  const byLabelDesc = (a: GroupRow, b: GroupRow) => b.total - a.total || a.label.localeCompare(b.label, 'es')

  // Etapas y prioridades en su orden natural, incluidas las que estan en cero
  const statusRows = groupActive(active, now, r => r.status)
  const byStatus = OPEN_STATUSES.map(s => {
    const row = statusRows.find(x => x.label === s)
    return { label: statusLabel(s), total: row?.total ?? 0, late: row?.late ?? 0 }
  })
  const priorityRows = groupActive(active, now, r => r.priority)
  const byPriority = MAINTENANCE_PRIORITIES.map(p => {
    const row = priorityRows.find(x => x.label === p.value)
    return { label: p.label, total: row?.total ?? 0, late: row?.late ?? 0 }
  })

  const closed = closedWeek.filter(r => r.status === 'cerrada')
  const cancelled = closedWeek.filter(r => r.status === 'cancelada')
  const evaluable = closed.filter(r => closedWithinSla(r) !== null)

  return {
    activeTotal: active.length,
    late: active.filter(r => isLate(r, now)).length,
    dueSoon: active.filter(r => dueSoon(r, now)).length,
    unassigned: active.filter(r => r.assignedUserId === null).length,
    urgent: active.filter(r => r.priority === 'urgente').length,
    needsReview: active.filter(r => r.needsReview).length,
    byStatus,
    byPriority,
    byAssignee: groupActive(active, now, r => r.assignedUserName ?? 'Sin asignar').sort(byLabelDesc),
    byCity: groupActive(active, now, r => r.city ?? 'Sin ciudad').sort(byLabelDesc),
    byAge: AGE_BUCKETS.map(b => ({
      label: b.label,
      total: active.filter(r => ageBucket(r, now) === b.label).length,
    })),
    closed: closed.length,
    cancelled: cancelled.length,
    closedWithinSla: evaluable.filter(r => closedWithinSla(r)).length,
    closedEvaluable: evaluable.length,
    avgDaysToClose: average(closed.map(daysToClose).filter((d): d is number => d !== null)),
    closedByPriority: MAINTENANCE_PRIORITIES.map(p => {
      const rows = closed.filter(r => r.priority === p.value)
      return {
        label: p.label,
        closed: rows.length,
        withinSla: rows.filter(r => closedWithinSla(r)).length,
        avgDays: average(rows.map(daysToClose).filter((d): d is number => d !== null)),
      }
    }),
  }
}

// ─── Hojas ──────────────────────────────────────────────────────────────────

type Cell = Record<string, unknown> | null
type Row = Cell[]

export interface ReportSheet {
  sheet: string
  data: Row[]
  columns: { width: number }[]
  stickyRowsCount?: number
}

const BRAND = '#1b99d3'
const HEADER = { backgroundColor: BRAND, textColor: '#ffffff', fontWeight: 'bold', alignVertical: 'center', wrap: true, height: 28 }
const SECTION = { fontWeight: 'bold', backgroundColor: '#e9ecef' }
const LATE_FILL = { backgroundColor: '#fde2e2', textColor: '#b91c1c' }
const WARN_FILL = { backgroundColor: '#fef3c7', textColor: '#92400e' }
const DATE_FORMAT = 'dd/mm/yyyy hh:mm'

/**
 * write-excel-file convierte las fechas como UTC. Se corre la hora para que
 * Excel muestre la hora local (Colombia) y no la de UTC.
 */
export function excelDate(ms: number): Date {
  const d = new Date(ms)
  return new Date(ms - d.getTimezoneOffset() * 60_000)
}

const text = (value: string | null | undefined, extra: Record<string, unknown> = {}): Cell =>
  ({ value: value ?? '', type: String, ...extra })
const num = (value: number | null, format?: string, extra: Record<string, unknown> = {}): Cell =>
  value === null ? text('—', { align: 'center', ...extra }) : { value, type: Number, ...(format ? { format } : {}), ...extra }
const pct = (value: number | null): Cell => num(value, '0%')
const date = (ms: number | null): Cell =>
  ms === null ? text('') : { value: excelDate(ms), type: Date, format: DATE_FORMAT }
const header = (titles: string[]): Row => titles.map(t => text(t, HEADER))
const section = (titles: string[]): Row => titles.map(t => text(t, SECTION))

export interface ReportInput {
  active: MaintenanceRequest[]
  closedWeek: MaintenanceRequest[]
  /** Motivo de cancelacion por id de solicitud (nota del cambio a cancelada). */
  cancelReasons: Map<number, string>
  now: Date
  range: { start: Date; end: Date }
  generatedBy: string
}

function summarySheet(input: ReportInput, s: ReportSummary): ReportSheet {
  const { now, range } = input
  const rows: Row[] = []
  const blank = () => rows.push([])

  rows.push([text('Informe de mantenimiento', { fontWeight: 'bold', fontSize: 14, textColor: BRAND, columnSpan: 4 }), null, null, null])
  rows.push([text('Generado'), text(formatDateTime(now), { columnSpan: 3 }), null, null])
  rows.push([text('Generado por'), text(input.generatedBy, { columnSpan: 3 }), null, null])
  rows.push([text('Solicitudes activas'), text(`Corte al ${formatDateTime(now)}`, { columnSpan: 3 }), null, null])
  rows.push([text('Cerradas y canceladas'), text(`Semana del ${weekLabel(range)}`, { columnSpan: 3 }), null, null])
  blank()

  rows.push(section(['Solicitudes activas', 'Cantidad', '% de activas', '']))
  rows.push([text('Total activas'), num(s.activeTotal), null, null])
  const kpi = (label: string, n: number, fill?: Record<string, unknown>) =>
    rows.push([text(label), num(n, undefined, n && fill ? fill : {}), pct(ratio(n, s.activeTotal)), null])
  kpi('Vencidas (fuera de plazo)', s.late, LATE_FILL)
  kpi('Vencen en menos de 24 h', s.dueSoon, WARN_FILL)
  kpi('Sin asignar', s.unassigned, WARN_FILL)
  kpi('Urgentes', s.urgent)
  kpi('Requieren revision', s.needsReview)
  blank()

  const groupSection = (title: string, groups: GroupRow[], extra?: (g: GroupRow) => Cell) => {
    rows.push(section([title, 'Total', 'Vencidas', extra ? 'Plazo' : '']))
    for (const g of groups) {
      rows.push([text(g.label), num(g.total), num(g.late, undefined, g.late ? LATE_FILL : {}), extra ? extra(g) : null])
    }
    blank()
  }
  groupSection('Activas por etapa', s.byStatus)
  const slaText = (label: string) => {
    const p = MAINTENANCE_PRIORITIES.find(x => x.label === label)
    const h = p ? SLA_HOURS[p.value] : null
    return text(h === null ? '' : h < 48 ? `${h} h` : `${h / 24} dias`)
  }
  groupSection('Activas por prioridad', s.byPriority, g => slaText(g.label))
  groupSection('Activas por responsable', s.byAssignee)
  groupSection('Activas por ciudad', s.byCity)

  rows.push(section(['Antiguedad de las activas', 'Total', '% de activas', '']))
  for (const b of s.byAge) rows.push([text(b.label), num(b.total), pct(ratio(b.total, s.activeTotal)), null])
  blank()

  rows.push(section([`Semana anterior (${formatDay(range.start)} al ${formatDay(new Date(range.end.getTime() - DAY_MS))})`, 'Cantidad', '%', '']))
  rows.push([text('Cerradas'), num(s.closed), null, null])
  rows.push([text('Canceladas'), num(s.cancelled), null, null])
  rows.push([text('Cerradas dentro del plazo'), num(s.closedWithinSla), pct(ratio(s.closedWithinSla, s.closedEvaluable)), null])
  rows.push([text('Promedio de dias hasta el cierre'), num(s.avgDaysToClose, '0.0'), null, null])
  blank()

  rows.push(section(['Cerradas por prioridad', 'Cerradas', 'Dentro del plazo', 'Promedio dias']))
  for (const p of s.closedByPriority) {
    rows.push([text(p.label), num(p.closed), pct(ratio(p.withinSla, p.closed)), num(p.avgDays, '0.0')])
  }
  blank()

  rows.push(section(['Notas', '', '', '']))
  const note = (t: string) => rows.push([text(t, { wrap: true, columnSpan: 4 }), null, null, null])
  note('Incluye todas las solicitudes de la empresa, sin filtros de responsable, ciudad ni prioridad.')
  note(`Plazos por prioridad, contados desde la recepcion: ${MAINTENANCE_PRIORITIES.map(p => `${p.label.toLowerCase()} ${SLA_HOURS[p.value] < 48 ? `${SLA_HOURS[p.value]} h` : `${SLA_HOURS[p.value] / 24} dias`}`).join(', ')}.`)
  note('Una cerrada cumple el plazo si se cerro dentro de el. Se mide hasta el cierre, asi que incluye la espera de confirmacion del cliente.')
  note('Las canceladas no cuentan en el cumplimiento ni en el promedio; su motivo esta en la hoja de cerradas.')

  return { sheet: 'Resumen', data: rows, columns: [{ width: 46 }, { width: 14 }, { width: 16 }, { width: 14 }] }
}

function activeSheet(input: ReportInput): ReportSheet {
  const now = input.now.getTime()
  const titles = [
    'Radicado', 'Recibida', 'Dias abierta', 'Vence', 'Plazo', 'Prioridad', 'Etapa', 'Categoria',
    'Subcategoria', 'Inmueble', 'Direccion', 'Ciudad', 'Reportante', 'Rol', 'Responsable',
    'A cargo de', 'Requiere revision',
  ]
  const rows: Row[] = [header(titles)]
  for (const r of [...input.active].sort(compareDefault)) {
    const state = slaState(r, now)
    const remaining = remainingHours(r, now)
    const fill = state === 'late' ? LATE_FILL : state === 'warn' ? WARN_FILL : {}
    rows.push([
      text(r.ticket),
      date(receivedAt(r)),
      num(ageHours(r, now) / 24, '0.0'),
      date(dueAt(r)),
      text(remaining === null ? '' : formatRemaining(remaining), fill),
      text(priorityLabel(r.priority)),
      text(statusLabel(r.status)),
      text(r.categoryLabel),
      text(r.subcategoryLabel),
      text(locationLabel(r)),
      text(r.propertyAddress),
      text(r.city),
      text(r.reporterName),
      text(r.clientType ? humanize(r.clientType) : ''),
      text(r.assignedUserName ?? 'Sin asignar'),
      text(r.responsibleParty ? responsiblePartyLabel(r.responsibleParty) : ''),
      text(r.needsReview ? 'Si' : ''),
    ])
  }
  if (rows.length === 1) rows.push([text('No hay solicitudes activas.', { columnSpan: titles.length })])
  return {
    sheet: 'Activas',
    data: rows,
    columns: [14, 16, 9, 16, 20, 10, 20, 18, 22, 28, 30, 14, 24, 13, 22, 13, 10].map(width => ({ width })),
    stickyRowsCount: 1,
  }
}

function closedSheet(input: ReportInput): ReportSheet {
  const titles = [
    'Radicado', 'Resultado', 'Recibida', 'Cerrada', 'Dias hasta el cierre', 'Cumplio el plazo',
    'Prioridad', 'Categoria', 'Subcategoria', 'Inmueble', 'Ciudad', 'Reportante', 'Rol',
    'Responsable', 'Motivo de cancelacion',
  ]
  const rows: Row[] = [header(titles)]
  const sorted = [...input.closedWeek].sort((a, b) => (closedAtMs(a) ?? 0) - (closedAtMs(b) ?? 0))
  for (const r of sorted) {
    const within = closedWithinSla(r)
    rows.push([
      text(r.ticket),
      text(r.status === 'cancelada' ? 'Cancelada' : 'Cerrada'),
      date(receivedAt(r)),
      date(closedAtMs(r)),
      num(daysToClose(r), '0.0'),
      text(within === null ? '' : within ? 'Si' : 'No', within === false ? LATE_FILL : {}),
      text(priorityLabel(r.priority)),
      text(r.categoryLabel),
      text(r.subcategoryLabel),
      text(locationLabel(r)),
      text(r.city),
      text(r.reporterName),
      text(r.clientType ? humanize(r.clientType) : ''),
      text(r.assignedUserName ?? 'Sin asignar'),
      text(r.status === 'cancelada' ? input.cancelReasons.get(r.id) ?? '' : '', { wrap: true }),
    ])
  }
  if (rows.length === 1) rows.push([text('No hubo solicitudes cerradas ni canceladas en la semana.', { columnSpan: titles.length })])
  return {
    sheet: 'Cerradas semana anterior',
    data: rows,
    columns: [14, 11, 16, 16, 10, 10, 10, 18, 22, 28, 14, 24, 13, 22, 40].map(width => ({ width })),
    stickyRowsCount: 1,
  }
}

export function buildReportSheets(input: ReportInput): ReportSheet[] {
  const summary = summarize(input.active, input.closedWeek, input.now.getTime())
  return [summarySheet(input, summary), activeSheet(input), closedSheet(input)]
}

export function reportFileName(now: Date): string {
  return `informe-mantenimiento-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.xlsx`
}

