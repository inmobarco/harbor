/** GET /staff/maintenance/requests exige admin o manager. */
export const MAINTENANCE_VIEW_ROLES = ['admin', 'manager']

/** Deben coincidir con MAINTENANCE_STATUSES del backend (CHECK de maintenance.request). */
export const MAINTENANCE_STATUSES = [
  { value: 'recibida', label: 'Recibida' },
  { value: 'en_revision', label: 'En revision' },
  { value: 'esperando_aprobacion', label: 'Esperando aprobacion' },
  { value: 'programada', label: 'Programada' },
  { value: 'en_ejecucion', label: 'En ejecucion' },
  { value: 'resuelta', label: 'Resuelta' },
  { value: 'cerrada', label: 'Cerrada' },
  { value: 'cancelada', label: 'Cancelada' },
] as const

export const MAINTENANCE_PRIORITIES = [
  { value: 'urgente', label: 'Urgente' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
] as const

/** Quien asume el costo. Debe coincidir con el CHECK de maintenance.request.responsible_party. */
export const RESPONSIBLE_PARTIES = [
  { value: 'propietario', label: 'Propietario' },
  { value: 'arrendatario', label: 'Arrendatario' },
  { value: 'inmobiliaria', label: 'Inmobiliaria' },
] as const

export type ResponsibleParty = typeof RESPONSIBLE_PARTIES[number]['value']

export function responsiblePartyLabel(value: string | null): string {
  if (!value) return 'Sin definir'
  return RESPONSIBLE_PARTIES.find(p => p.value === value)?.label ?? value
}

export type MaintenanceStatus = typeof MAINTENANCE_STATUSES[number]['value']
export type MaintenancePriority = typeof MAINTENANCE_PRIORITIES[number]['value']

export function statusLabel(status: string): string {
  return MAINTENANCE_STATUSES.find(s => s.value === status)?.label ?? status
}

export function priorityLabel(priority: string): string {
  return MAINTENANCE_PRIORITIES.find(p => p.value === priority)?.label ?? priority
}

/**
 * Fila del listado de staff. El backend omite a proposito cedula, correo,
 * consentimiento y payload original: esos van en el detalle.
 */
export interface MaintenanceRequest {
  id: number
  ticket: string
  status: string
  priority: string
  responsibleParty: string | null
  needsReview: boolean
  reviewReason: string | null
  reporterName: string | null
  reporterPhone: string | null
  clientType: string | null
  contractNumber: string | null
  contractVerified: boolean
  propertyAddress: string | null
  city: string | null
  /** Nombre de la unidad / conjunto residencial. */
  unit: string | null
  aptNum: string | null
  categoryCode: string
  categoryLabel: string
  subcategoryCode: string | null
  subcategoryLabel: string | null
  /** Primeros 160 caracteres de la descripcion. */
  descriptionPreview: string | null
  isHappeningNow: boolean
  entryAuthorization: string | boolean | null
  assignedUserId: number | null
  assignedUserName: string | null
  attachmentCount: number
  submittedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
  isActive: boolean
}

/** Estados en curso: el tablero los carga todos de una vez. */
export const OPEN_STATUSES: MaintenanceStatus[] = [
  'recibida', 'en_revision', 'esperando_aprobacion', 'programada', 'en_ejecucion', 'resuelta',
]

/** Estados finales: no se reabren, solo se consultan en la tabla. */
export const CLOSED_STATUSES: MaintenanceStatus[] = ['cerrada', 'cancelada']

/** Recorrido normal de una solicitud. Se puede saltar o retroceder entre etapas. */
export const STATUS_FLOW: MaintenanceStatus[] = [
  'recibida', 'en_revision', 'esperando_aprobacion', 'programada', 'en_ejecucion', 'resuelta', 'cerrada',
]

/**
 * Tiempo de respuesta esperado por prioridad, en horas desde que se recibio.
 * El reloj sigue corriendo en todas las etapas hasta que la solicitud se resuelve.
 */
export const SLA_HOURS: Record<MaintenancePriority, number> = {
  urgente: 24,
  alta: 72,
  media: 5 * 24,
  baja: 10 * 24,
}

/** Estados en los que corre el plazo. En resuelta el trabajo ya se hizo. */
export const SLA_STATUSES: MaintenanceStatus[] = [
  'recibida', 'en_revision', 'esperando_aprobacion', 'programada', 'en_ejecucion',
]

export const BOARD_COLUMNS: {
  key: string
  title: string
  hint: string
  statuses: MaintenanceStatus[]
  dotClass: string
}[] = [
  { key: 'nuevas', title: 'Nuevas', hint: 'Clasificar, asignar y validar contrato', statuses: ['recibida', 'en_revision'], dotClass: 'bg-harbor-info' },
  { key: 'aprobacion', title: 'Esperando aprobacion', hint: 'Cotizacion enviada al propietario', statuses: ['esperando_aprobacion'], dotClass: 'bg-harbor-warning' },
  { key: 'curso', title: 'En curso', hint: 'Visita agendada o tecnico en sitio', statuses: ['programada', 'en_ejecucion'], dotClass: 'bg-harbor-blue' },
  { key: 'resueltas', title: 'Resueltas', hint: 'Confirmar con el cliente y cerrar', statuses: ['resuelta'], dotClass: 'bg-harbor-success' },
]

export type QuickFilterKey = 'nuevas24' | 'urgentes' | 'sinAsignar' | 'revision' | 'vencidas'

/** Responsable en el filtro: id de usuario o 'none' = sin asignar. */
export type AssigneeFilter = number | 'none'

export interface MaintenanceFilters {
  q: string
  priority: MaintenancePriority[]
  /** Se combinan con O. Vacio = todos los responsables. */
  assignees: AssigneeFilter[]
  /** Ciudad exacta, como la devuelve la API. null = todas. */
  city: string | null
  /** Accesos rapidos de los indicadores. Solo aplican a solicitudes en curso. */
  quick: QuickFilterKey | null
}

/** Usuario de /staff/users que puede tener solicitudes asignadas. */
export interface MaintenanceStaff {
  id: number
  name: string
  color: string | null
}

/** Fases en el orden que las devuelve el backend. */
export const ATTACHMENT_PHASES = [
  { value: 'antes', label: 'Reporte (antes)' },
  { value: 'despues', label: 'Tecnico (despues)' },
  { value: 'soportes', label: 'Soportes' },
] as const

export function phaseLabel(phase: string): string {
  return ATTACHMENT_PHASES.find(p => p.value === phase)?.label ?? phase
}

/**
 * Archivo de GET /staff/maintenance/requests/{id}/attachments.
 * url y downloadUrl son URL firmadas de R2 que caducan en urlExpiresAt:
 * no se guardan, se vuelven a pedir al endpoint.
 */
export interface MaintenanceAttachment {
  id: number
  requestId: number
  phase: string
  position: number
  originalName: string | null
  contentType: string | null
  sizeBytes: number | null
  storageStatus: string | null
  createdAt: string
  /** Para mostrarlo en el navegador (<img>, <video>, visor PDF). */
  url: string
  /** Fuerza la descarga con nombre MNT-000067-archivo1.jpg. */
  downloadUrl: string
  urlExpiresAt: string
}

export type AttachmentPreviewKind = 'image' | 'video' | 'audio' | 'pdf'

// HEIC/HEIF y TIFF son image/* pero solo Safari los pinta: se tratan como descarga
const NON_RENDERABLE_IMAGES = ['image/heic', 'image/heif', 'image/tiff']

/** Como se puede ver el archivo dentro de Harbor; null = solo descarga. */
export function previewKind(contentType: string | null): AttachmentPreviewKind | null {
  const ct = (contentType ?? '').toLowerCase().split(';')[0].trim()
  if (!ct) return null
  if (ct === 'application/pdf') return 'pdf'
  if (ct.startsWith('image/')) return NON_RENDERABLE_IMAGES.includes(ct) ? null : 'image'
  if (ct.startsWith('video/')) return 'video'
  if (ct.startsWith('audio/')) return 'audio'
  return null
}

/**
 * GET /staff/maintenance/requests/{id}: todo lo del listado mas los datos
 * personales, la disponibilidad y la evidencia de consentimiento.
 */
export interface MaintenanceRequestDetail extends MaintenanceRequest {
  submissionId: string | null
  reporterDocument: string | null
  reporterEmail: string | null
  categoryId: number | null
  subcategoryId: number | null
  /** Descripcion completa (el listado solo trae 160 caracteres). */
  description: string | null
  availableDays: string[]
  timeSlot: string | null
  availabilityNotes: string | null
  archivePrefix: string | null
  consentAccepted: boolean
  consentPolicyVersion: string | null
  consentAcceptedAt: string | null
  consentIp: string | null
  consentUserAgent: string | null
  /** Payload original del formulario, tal como llego. */
  rawPayload: unknown
}

/** Evento de GET /staff/maintenance/requests/{id}/events. */
export interface MaintenanceEvent {
  id: number
  requestId: number
  eventType: string
  fromStatus: string | null
  toStatus: string | null
  note: string | null
  metadata: Record<string, unknown> | null
  actorUserId: number | null
  actorLabel: string | null
  /** Nombre del usuario, o la etiqueta del sistema (web, n8n, sistema). */
  actorName: string | null
  createdAt: string
}

/** Agrupacion de la bitacora para los filtros. */
export type EventKind = 'status' | 'note' | 'system' | 'other'

/**
 * Cuerpo de PATCH /staff/maintenance/requests/{id}. Solo se envia lo que
 * cambia. Un cambio de estado con note deja la nota en el mismo evento.
 */
export interface MaintenanceRequestUpdate {
  status?: MaintenanceStatus
  priority?: MaintenancePriority
  assigned_user_id?: number | null
  responsible_party?: ResponsibleParty | null
  needs_review?: boolean
  review_reason?: string | null
  /** Obligatoria al cancelar. */
  note?: string
}
