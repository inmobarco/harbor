import {
  CLOSED_STATUSES,
  OPEN_STATUSES,
  SLA_HOURS,
  SLA_STATUSES,
  priorityLabel,
  responsiblePartyLabel,
} from '~/types/maintenance'
import type {
  AssigneeFilter,
  EventKind,
  MaintenanceEvent,
  MaintenanceRequestUpdate,
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
    r.contractNumber, r.propertyAddress, r.city,
  ].filter(Boolean).join(' ')
  return fold(haystack).includes(term)
}

/** Vacio = todos. 'none' incluye las que no tienen responsable. */
export function matchesAssignees(r: MaintenanceRequest, assignees: AssigneeFilter[]): boolean {
  if (!assignees.length) return true
  return assignees.includes(r.assignedUserId ?? 'none')
}

export function matchesFilters(r: MaintenanceRequest, f: MaintenanceFilters, now: number): boolean {
  if (!matchesSearch(r, f.q)) return false
  if (f.priority.length && !f.priority.includes(r.priority as MaintenancePriority)) return false
  if (!matchesAssignees(r, f.assignees)) return false
  if (f.city && r.city !== f.city) return false
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

/**
 * Clasifica un evento para los filtros de la bitacora. Se apoya en los campos
 * y no solo en event_type, para no depender de cada nombre que use el backend.
 */
export function eventKind(e: MaintenanceEvent): EventKind {
  if (e.fromStatus || e.toStatus) return 'status'
  if (/note|nota|comment/i.test(e.eventType)) return 'note'
  if (e.actorUserId === null) return 'system'
  return 'other'
}

/** Metadata plana como pares "clave: valor" legibles; ignora objetos anidados. */
export function metadataEntries(metadata: Record<string, unknown> | null): { key: string; value: string }[] {
  if (!metadata) return []
  return Object.entries(metadata)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
    .map(([k, v]) => ({ key: humanize(k), value: typeof v === 'boolean' ? (v ? 'Si' : 'No') : String(v) }))
}

/** cerrada y cancelada son finales: el backend rechaza cambiarles el estado. */
export function isFinal(r: MaintenanceRequest): boolean {
  return CLOSED_STATUSES.includes(r.status as MaintenanceStatus)
}

/**
 * Siguiente paso habitual desde cada estado, para los botones del panel. El
 * primero es el camino normal; el segundo, el atajo (p. ej. una urgencia que
 * se repara sin cotizar). Cualquier otro salto va por "Otro estado".
 * "Tomar" asigna a quien lo pulsa: lo hace withAutoAssign en el PATCH.
 */
export const NEXT_STEPS: Partial<Record<MaintenanceStatus, { to: MaintenanceStatus; label: string }[]>> = {
  recibida: [{ to: 'en_revision', label: 'Tomar e iniciar seguimiento' }],
  en_revision: [
    { to: 'programada', label: 'Agendar revision y cotizacion' },
    { to: 'en_ejecucion', label: 'Enviar a reparar' },
  ],
  programada: [
    { to: 'esperando_aprobacion', label: 'Enviar cotizacion' },
    { to: 'en_ejecucion', label: 'Enviar a reparar' },
  ],
  esperando_aprobacion: [{ to: 'en_ejecucion', label: 'Aprobada · enviar a reparar' }],
  en_ejecucion: [{ to: 'resuelta', label: 'Marcar resuelta' }],
  resuelta: [{ to: 'cerrada', label: 'Cerrar solicitud' }],
}

/** Ciudades presentes en los datos, para el filtro. */
export function distinctCities(requests: MaintenanceRequest[]): string[] {
  const cities = new Set<string>()
  for (const r of requests) if (r.city) cities.add(r.city)
  return [...cities].sort((a, b) => a.localeCompare(b, 'es'))
}

const FIELD_LABELS: Record<string, string> = {
  priority: 'Prioridad',
  responsible_party: 'A cargo de',
  needs_review: 'Marca de revision',
  review_reason: 'Motivo de revision',
}

function fieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Si' : 'No'
  if (field === 'priority') return priorityLabel(String(value))
  if (field === 'responsible_party') return responsiblePartyLabel(String(value))
  return String(value)
}

/**
 * Texto legible para los eventos que genera el PATCH (asignacion y
 * actualizacion). null para los demas: se muestran con su nota o metadata.
 * userName traduce los ids de asignacion a nombres.
 */
export function describeEvent(
  e: MaintenanceEvent,
  userName: (id: number) => string,
): { title: string; detail: string | null } | null {
  const meta = e.metadata ?? {}
  if (e.eventType === 'asignacion') {
    const name = (v: unknown) => (typeof v === 'number' ? userName(v) : 'Sin asignar')
    return { title: 'Responsable', detail: `${name(meta.from)} → ${name(meta.to)}` }
  }
  if (e.eventType === 'actualizacion' && typeof meta.field === 'string') {
    const field = meta.field
    const change = `${fieldValue(field, meta.from)} → ${fieldValue(field, meta.to)}`
    const reason = field === 'needs_review' && meta.to === true && meta.reason ? ` · ${meta.reason}` : ''
    return { title: FIELD_LABELS[field] ?? humanize(field), detail: change + reason }
  }
  return null
}

/**
 * Quien hace un cambio sobre una solicitud sin responsable la toma: se agrega
 * assigned_user_id al PATCH. Si el cambio ya elige responsable (incluso
 * "sin asignar"), se respeta esa eleccion.
 */
export function withAutoAssign(
  payload: MaintenanceRequestUpdate,
  current: MaintenanceRequest | null,
  myUserId: number | null,
): MaintenanceRequestUpdate {
  if (!current || current.assignedUserId !== null || myUserId === null) return payload
  if ('assigned_user_id' in payload) return payload
  return { ...payload, assigned_user_id: myUserId }
}
