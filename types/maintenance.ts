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

/** Filtros que se envian al endpoint. Vacio = sin filtro. */
export interface MaintenanceFilters {
  status: MaintenanceStatus[]
  priority: MaintenancePriority[]
  q: string
  needsReview: boolean
  unassigned: boolean
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
