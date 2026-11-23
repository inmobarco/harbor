// Captaciones de los asesores: GET {API_BASE}/staff/acquisitions (admin o manager).
// Filtros opcionales: ?user_id=12 y ?after=2026-01-01T00:00:00 (acquisition_date >= after).

/** Fila tal como la devuelve la API (analytics.property_acquisitions + auth.user) */
export interface AcquisitionApiRow {
  id: number
  /** Fecha (YYYY-MM-DD) o fecha-hora ISO sin zona */
  acquisition_date: string
  user_id: number | null
  first_name: string | null
  last_name: string | null
  wasi_code: string | null
  apartment_number: string | null
  unit_name: string | null
  city: string | null
  business_type: string | null
  /** numeric de Postgres: puede llegar como numero o como texto */
  sale_price: number | string | null
  rent_price: number | string | null
  has_storeroom: boolean | null
  created_at: string | null
  updated_at: string | null
}

/** Captacion normalizada para la UI */
export interface Acquisition {
  id: number
  date: Date
  userId: number | null
  advisorName: string
  wasiCode: string | null
  unitName: string | null
  apartmentNumber: string | null
  city: string | null
  businessType: string | null
  salePrice: number | null
  rentPrice: number | null
}

/** Asesor del roster de /staff/users, para color y para listar a quien no capto */
export interface AcquisitionAdvisor {
  id: number
  name: string
  color: string
  role: string
  isActive: boolean
}

export interface WeekRange {
  start: Date
  /** Exclusivo: lunes siguiente a las 00:00 */
  end: Date
  label: string
}

export interface AdvisorAcquisitionsRow {
  advisor: { id: number | null; name: string; color: string }
  current: Acquisition[]
  previous: Acquisition[]
}

/**
 * Roles que ven las captaciones en el dashboard.
 * Solo oculta el widget: quien autoriza es la API (require_admin_or_manager).
 */
export const ACQUISITIONS_ROLES = ['admin', 'manager']

/** Roles que aparecen en la tabla aunque no tengan captaciones en el periodo */
export const ACQUISITIONS_ROSTER_ROLES = ['listing_agent', 'sales_agent']
