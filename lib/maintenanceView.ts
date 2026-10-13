import {
  OPEN_STATUSES,
  SLA_HOURS,
  SLA_STATUSES,
} from '~/types/maintenance'
import type {
  MaintenanceFilters,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStatus,
  QuickFilterKey,
} from '~/types/maintenance'

/**
 * Reglas del tablero de mantenimiento: antiguedad, plazos, accesos rapidos y
 * busqueda. Funciones puras (reciben `now`) para poder probarlas sin Nuxt.
 */

const HOUR_MS = 3_600_000

/** A partir de esta fraccion del plazo la tarjeta se marca en amarillo. */
export const SLA_WARN_RATIO = 0.6

export const PRIORITY_RANK: Record<string, number> = { urgente: 0, alta: 1, media: 2, baja: 3 }

export function isOpen(r: MaintenanceRequest): boolean {
  return OPEN_STATUSES.includes(r.status as MaintenanceStatus)
}

/** Horas desde que se recibio (submitted_at; si falta, created_at). */
export function ageHours(r: MaintenanceRequest, now: number): number {
  const start = Date.parse(r.submittedAt ?? r.createdAt)
  return Number.isNaN(start) ? 0 : Math.max(0, (now - start) / HOUR_MS)
}

export function slaHours(r: MaintenanceRequest): number | null {
  return SLA_HOURS[r.priority as MaintenancePriority] ?? null
}

/** null cuando el plazo no aplica (resuelta, cerrada, cancelada o prioridad desconocida). */
export function slaState(r: MaintenanceRequest, now: number): 'ok' | 'warn' | 'late' | null {
  const limit = slaHours(r)
  if (limit === null || !SLA_STATUSES.includes(r.status as MaintenanceStatus)) return null
  const ratio = ageHours(r, now) / limit
  if (ratio >= 1) return 'late'
  if (ratio >= SLA_WARN_RATIO) return 'warn'
  return 'ok'
}

export function formatAge(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 48) return `${Math.round(hours)} h`
  return `${Math.round(hours / 24)} d`
}

export const QUICK_FILTERS: {
  key: QuickFilterKey
  label: string
  tone: 'neutral' | 'warn' | 'crit'
  test: (r: MaintenanceRequest, now: number) => boolean
}[] = [
  { key: 'nuevas24', label: 'Nuevas en 24 h', tone: 'neutral', test: (r, now) => isOpen(r) && ageHours(r, now) <= 24 },
  { key: 'urgentes', label: 'Urgentes abiertas', tone: 'crit', test: r => isOpen(r) && r.priority === 'urgente' },
  { key: 'sinAsignar', label: 'Sin asignar', tone: 'warn', test: r => isOpen(r) && r.assignedUserId === null },
  { key: 'revision', label: 'Requieren revision', tone: 'warn', test: r => isOpen(r) && r.needsReview },
  { key: 'vencidas', label: 'Fuera de tiempo', tone: 'crit', test: (r, now) => slaState(r, now) === 'late' },
]

/** Minusculas y sin tildes, para que "zuniga" encuentre "Zúñiga". */
function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesSearch(r: MaintenanceRequest, q: string): boolean {
  const term = fold(q.trim())
  if (!term) return true
  const haystack = [
    r.ticket, r.reporterName, r.unit, r.aptNum, r.categoryLabel, r.subcategoryLabel,
    r.contractNumber, r.propertyAddress,
  ].filter(Boolean).join(' ')
  return fold(haystack).includes(term)
}

export function matchesFilters(r: MaintenanceRequest, f: MaintenanceFilters, now: number): boolean {
  if (!matchesSearch(r, f.q)) return false
  if (f.priority.length && !f.priority.includes(r.priority as MaintenancePriority)) return false
  if (f.assignee === 'none' && r.assignedUserId !== null) return false
  if (typeof f.assignee === 'number' && r.assignedUserId !== f.assignee) return false
  if (f.quick) {
    const quick = QUICK_FILTERS.find(q => q.key === f.quick)
    if (quick && !quick.test(r, now)) return false
  }
  return true
}

/** Tablero: lo mas urgente arriba y, a igual prioridad, lo mas antiguo primero. */
export function compareForBoard(a: MaintenanceRequest, b: MaintenanceRequest): number {
  const rank = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
  if (rank) return rank
  return Date.parse(a.submittedAt ?? a.createdAt) - Date.parse(b.submittedAt ?? b.createdAt)
}

export function compareByUpdatedDesc(a: MaintenanceRequest, b: MaintenanceRequest): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
}

/** "Apto 1204 · Reserva de la Loma". Si apt_num ya trae "Casa 14" no se antepone "Apto". */
export function locationLabel(r: MaintenanceRequest): string {
  const apt = r.aptNum ? (/^\d/.test(r.aptNum) ? `Apto ${r.aptNum}` : r.aptNum) : null
  return [apt, r.unit].filter(Boolean).join(' · ')
}

/** Valores tipo codigo (propietario, arrendatario...) a texto legible. */
export function humanize(value: string | null): string {
  if (!value) return '—'
  const s = value.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const dateFormat = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

export function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : dateFormat.format(d)
}
