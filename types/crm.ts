// Tipos del CRM de Wasi + mapa de asesores de la API propia.
//
// El asesor no se identifica por id_user de Wasi, sino por una "propiedad dummy"
// asociada a el. GET {API_BASE}/staff/crm/advisor-map devuelve ese mapeo y con
// id_property_wasi se consulta GET /v1/client/search?id_property=...

/** Fila de {API_BASE}/staff/crm/advisor-map (solo admin) */
export interface AdvisorMapEntry {
  user_id: number
  first_name: string
  last_name: string
  id_property_wasi: string
}

/** Cliente tal como lo devuelve GET /v1/client/search de Wasi */
export interface WasiClient {
  id_client: number
  id_user: number
  id_client_type: number | null
  client_type_label: string | null
  id_client_status: number | null
  client_status_label: string | null
  id_pipeline: number | null
  client_pipeline_label: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  cell_phone: string | null
  city_label: string | null
  comment: string | null
  reference: string | null
  created_at: string | null
  updated_at: string | null
  tag: Array<{ id: number; etiqueta: string; color: string }> | []
}

/** Cliente normalizado para la UI */
export interface CrmClient {
  id: number
  name: string
  phone: string | null
  email: string | null
  statusId: number | null
  statusLabel: string
  typeLabel: string
  cityLabel: string | null
  createdAt: string | null
  updatedAt: string | null
  /** Dias desde la ultima actualizacion en Wasi (null si no hay fecha) */
  daysSinceUpdate: number | null
}

export interface CrmStatusCount {
  statusId: number | null
  label: string
  count: number
}

export interface CrmAdvisorStats {
  /** Total de clientes del asesor segun Wasi */
  total: number
  /** Conteo por estado, ordenado segun CLIENT_STATUS_ORDER */
  byStatus: CrmStatusCount[]
  /** Nuevo + En Proceso */
  active: number
  /** Activos cuya ultima novedad en Wasi tiene mas de 30 dias */
  staleOver30d: number
  /** Creados en los ultimos 30 dias */
  newLast30d: number
}

export interface CrmAdvisorOverview {
  advisor: {
    id: string
    name: string
    color: string
    idPropertyWasi: string | null
  }
  /** Los 5 clientes agregados mas recientemente */
  clients: CrmClient[]
  stats: CrmAdvisorStats
  /** Mensaje si la consulta a Wasi fallo para este asesor */
  error: string | null
}

export interface CrmOverviewResponse {
  advisors: CrmAdvisorOverview[]
  totals: {
    advisors: number
    clients: number
    active: number
    staleOver30d: number
  }
  generatedAt: string
}

/**
 * Orden de estados en el resumen (los desconocidos van al final).
 * Los estilos por estado viven en composables/useCrm.ts porque Tailwind
 * no escanea types/.
 */
export const CLIENT_STATUS_ORDER = ['Nuevo', 'En Proceso', 'Convertido', 'Perdido']

/**
 * Roles que ven el resumen de clientes por asesor.
 * Solo oculta el widget en la UI: quien autoriza de verdad es la API en
 * GET /staff/crm/advisor-map, que debe aceptar los mismos roles.
 */
export const CRM_OVERVIEW_ROLES = ['admin', 'manager']
