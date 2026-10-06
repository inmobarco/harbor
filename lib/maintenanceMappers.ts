import type { MaintenanceFilters, MaintenanceRequest } from '~/types/maintenance'

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
    tower: str(raw.tower),
    unit: str(raw.unit),
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

/** Arma el query string: listas como CSV y solo los filtros activos. */
export function buildMaintenanceQuery(
  filters: MaintenanceFilters,
  limit: number,
  offset: number,
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = { limit, offset }
  if (filters.status.length) query.status = filters.status.join(',')
  if (filters.priority.length) query.priority = filters.priority.join(',')
  if (filters.q.trim()) query.q = filters.q.trim()
  if (filters.needsReview) query.needs_review = true
  if (filters.unassigned) query.unassigned = true
  return query
}
