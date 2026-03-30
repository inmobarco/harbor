export interface Advisor {
  id: string
  name: string
  color: string  // hex color asignado desde ADVISOR_COLORS
}

export interface AdvisorApiResponse {
  id: number
  username: string
  first_name: string
  last_name: string
  phone: string
  role: string
  is_active: boolean
  created_at: string
}

export interface AdvisorMetrics {
  // TODO: Metricas de desempeno desde API propia
  totalAppointments?: number
  completedAppointments?: number
  cancelledAppointments?: number
  conversionRate?: number
  avgResponseTime?: number
}

export const ADVISOR_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
] as const
