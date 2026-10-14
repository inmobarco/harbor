import type {
  MaintenanceAttachment,
  MaintenanceEvent,
  MaintenanceFilters,
  MaintenanceRequest,
  MaintenanceRequestDetail,
  MaintenanceStaff,
} from '~/types/maintenance'

/**
 * Mapeo de /staff/maintenance/requests a los tipos de la app. Aislado del
 * store para poder ejercitarlo sin Nuxt ni Pinia.
 */

function str(value: any): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s || null
}

export function normalizeMaintenanceRequest(raw: any): MaintenanceRequest {
  return {
    id: Number(raw.id),
    ticket: String(raw.ticket ?? ''),
    status: String(raw.status ?? ''),
    priority: String(raw.priority ?? ''),
    responsibleParty: str(raw.responsible_party),
    needsReview: raw.needs_review === true,
    reviewReason: str(raw.review_reason),
    reporterName: str(raw.reporter_name),
    reporterPhone: str(raw.reporter_phone),
    clientType: str(raw.client_type),
    contractNumber: str(raw.contract_number),
    contractVerified: raw.contract_verified === true,
    propertyAddress: str(raw.property_address),
    city: str(raw.city),
    unit: str(raw.unit),
    aptNum: str(raw.apt_num),
    categoryCode: String(raw.category_code ?? ''),
    categoryLabel: String(raw.category_label ?? raw.category_code ?? ''),
    subcategoryCode: str(raw.subcategory_code),
    subcategoryLabel: str(raw.subcategory_label),
    descriptionPreview: str(raw.description_preview),
    isHappeningNow: raw.is_happening_now === true,
    entryAuthorization: typeof raw.entry_authorization === 'boolean'
      ? raw.entry_authorization
      : str(raw.entry_authorization),
    assignedUserId: raw.assigned_user_id != null ? Number(raw.assigned_user_id) : null,
    assignedUserName: str(raw.assigned_user_name),
    attachmentCount: Number(raw.attachment_count ?? 0),
    submittedAt: raw.submitted_at ?? null,
    closedAt: raw.closed_at ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    isActive: raw.is_active !== false,
  }
}

/** available_days puede llegar como arreglo (text[]) o como texto separado por comas. */
function stringList(value: any): string[] {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean)
  return []
}

/** jsonb: el backend ya lo convierte a objeto, pero se tolera que llegue como texto. */
function jsonValue(value: any): any {
  if (typeof value !== 'string') return value ?? null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function normalizeMaintenanceRequestDetail(raw: any): MaintenanceRequestDetail {
  const description = str(raw.description)
  return {
    ...normalizeMaintenanceRequest({
      ...raw,
      // El detalle no trae el recorte del listado: se arma igual para no romper la vista
      description_preview: raw.description_preview ?? description?.slice(0, 160) ?? null,
    }),
    submissionId: str(raw.submission_id),
    reporterDocument: str(raw.reporter_document),
    reporterEmail: str(raw.reporter_email),
    categoryId: raw.category_id != null ? Number(raw.category_id) : null,
    subcategoryId: raw.subcategory_id != null ? Number(raw.subcategory_id) : null,
    description,
    availableDays: stringList(raw.available_days),
    timeSlot: str(raw.time_slot),
    availabilityNotes: str(raw.availability_notes),
    archivePrefix: str(raw.archive_prefix),
    consentAccepted: raw.consent_accepted === true,
    consentPolicyVersion: str(raw.consent_policy_version),
    consentAcceptedAt: raw.consent_accepted_at ?? null,
    consentIp: str(raw.consent_ip),
    consentUserAgent: str(raw.consent_user_agent),
    rawPayload: jsonValue(raw.raw_payload),
  }
}

export function normalizeMaintenanceEvent(raw: any): MaintenanceEvent {
  const metadata = jsonValue(raw.metadata)
  return {
    id: Number(raw.id),
    requestId: Number(raw.request_id),
    eventType: String(raw.event_type ?? ''),
    fromStatus: str(raw.from_status),
    toStatus: str(raw.to_status),
    note: str(raw.note),
    metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : null,
    actorUserId: raw.actor_user_id != null ? Number(raw.actor_user_id) : null,
    actorLabel: str(raw.actor_label),
    actorName: str(raw.actor_name) ?? str(raw.actor_label),
    createdAt: raw.created_at,
  }
}

export function normalizeMaintenanceAttachment(raw: any): MaintenanceAttachment {
  return {
    id: Number(raw.id),
    requestId: Number(raw.request_id),
    phase: String(raw.phase ?? ''),
    position: Number(raw.position ?? 0),
    originalName: str(raw.original_name),
    contentType: str(raw.content_type),
    sizeBytes: raw.size_bytes != null ? Number(raw.size_bytes) : null,
    storageStatus: str(raw.storage_status),
    createdAt: raw.created_at,
    url: raw.url,
    downloadUrl: raw.download_url,
    urlExpiresAt: raw.url_expires_at,
  }
}

/**
 * Arma el query string: listas como CSV y solo los filtros activos.
 * Los accesos rapidos (quick) no tienen equivalente en el backend: se aplican
 * en el cliente y por eso no se envian. Tampoco varios responsables a la vez:
 * la API acepta un assigned_user_id o unassigned, no ambos. Con mas de uno no
 * se envia nada y el filtro lo aplica el cliente.
 */
export function buildMaintenanceQuery(
  statuses: readonly string[],
  filters: Pick<MaintenanceFilters, 'q' | 'priority' | 'assignees' | 'city'> | null,
  limit: number,
  offset: number,
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = { limit, offset }
  if (statuses.length) query.status = statuses.join(',')
  if (!filters) return query
  if (filters.priority.length) query.priority = filters.priority.join(',')
  if (filters.q.trim()) query.q = filters.q.trim()
  if (filters.city) query.city = filters.city
  if (filters.assignees.length === 1) {
    const [only] = filters.assignees
    if (only === 'none') query.unassigned = true
    else query.assigned_user_id = only
  }
  return query
}

/** Fila de /staff/users a responsable de mantenimiento. */
export function normalizeMaintenanceStaff(raw: any): MaintenanceStaff {
  return {
    id: Number(raw.id),
    name: [raw.first_name, raw.last_name].filter(Boolean).join(' ').trim() || raw.username || `Usuario ${raw.id}`,
    color: str(raw.color),
  }
}
