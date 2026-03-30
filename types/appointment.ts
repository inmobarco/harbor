export type AppointmentType = 'visit' | 'meeting' | 'signing' | 'followUp' | 'other'
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'deleted'
export type AppointmentDuration = 30 | 60 | 90 | 120

export interface Appointment {
  id: string
  advisorId: string
  title: string
  description?: string
  date: string          // ISO 8601
  duration: AppointmentDuration
  clientName?: string
  clientPhone?: string
  type: AppointmentType
  status: AppointmentStatus
  createdAt: string     // ISO 8601
}

export interface AppointmentApiResponse {
  id: number
  user_id: number
  title: string
  description: string | null
  appointment_date: string
  duration_minutes: number
  client_name: string | null
  client_phone: string | null
  appointment_type: AppointmentType
  status: AppointmentStatus
  outcome: string | null
  created_at: string
  updated_at: string
}

export interface CreateAppointmentPayload {
  advisorId: string
  advisorName?: string
  title: string
  description?: string
  date: string
  duration: AppointmentDuration
  clientName?: string
  clientPhone?: string
  type: AppointmentType
  notes?: string
}

export const appointmentTypeLabels: Record<AppointmentType, string> = {
  visit: 'Visita a propiedad',
  meeting: 'Reunion',
  signing: 'Firma de contrato',
  followUp: 'Seguimiento',
  other: 'Otros',
}

export const appointmentDurationLabels: Record<AppointmentDuration, string> = {
  30: '30 minutos',
  60: '1 hora',
  90: '1.5 horas',
  120: '2 horas',
}
