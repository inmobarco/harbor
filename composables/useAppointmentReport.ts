import { useAgendaStore } from '~/stores/agenda'
import { useAuthStore } from '~/stores/auth'
import type { AppointmentApiResponse, AppointmentStatus } from '~/types/appointment'
import { appointmentTypeLabels } from '~/types/appointment'

// --- Periodos ------------------------------------------------------------

export type AppointmentReportPeriod = 'current' | 'previous'

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Rango [start, end) del mes, en hora local. */
function monthRange(period: AppointmentReportPeriod) {
  const now = new Date()
  const offset = period === 'previous' ? -1 : 0
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  return { start, end }
}

export function monthLabel(period: AppointmentReportPeriod): string {
  const { start } = monthRange(period)
  return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`
}

// --- Lectura de campos ---------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0')

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function hm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function dateTime(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : `${ymd(d)} ${hm(d)}`
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  deleted: 'Eliminada',
}

interface ReportRow {
  advisor: string
  date: Date
  apt: AppointmentApiResponse
}

// --- Columnas ------------------------------------------------------------

const CENTER = { align: 'center' as const }

interface ReportColumn {
  title: string
  /** Ancho de columna, en caracteres */
  width: number
  cell: (r: ReportRow) => Record<string, unknown>
}

const COLUMNS: ReportColumn[] = [
  { title: 'Asesor', width: 24, cell: r => ({ value: r.advisor, type: String }) },
  { title: 'Fecha', width: 12, cell: r => ({ value: ymd(r.date), type: String, ...CENTER }) },
  { title: 'Hora', width: 8, cell: r => ({ value: hm(r.date), type: String, ...CENTER }) },
  { title: 'Duración (min)', width: 10, cell: r => ({ value: r.apt.duration_minutes, type: Number, ...CENTER }) },
  { title: 'Título', width: 32, cell: r => ({ value: r.apt.title, type: String }) },
  { title: 'Tipo', width: 18, cell: r => ({ value: appointmentTypeLabels[r.apt.appointment_type] ?? r.apt.appointment_type, type: String }) },
  { title: 'Estado', width: 12, cell: r => ({ value: STATUS_LABELS[r.apt.status] ?? r.apt.status, type: String, ...CENTER }) },
  { title: 'Cliente', width: 24, cell: r => ({ value: r.apt.client_name ?? '', type: String }) },
  { title: 'Teléfono cliente', width: 15, cell: r => ({ value: r.apt.client_phone ?? '', type: String }) },
  { title: 'Descripción', width: 40, cell: r => ({ value: r.apt.description ?? '', type: String, wrap: true }) },
  { title: 'Resultado', width: 30, cell: r => ({ value: r.apt.outcome ?? '', type: String, wrap: true }) },
  { title: 'ID cita', width: 9, cell: r => ({ value: r.apt.id, type: Number, ...CENTER }) },
  { title: 'Creada', width: 17, cell: r => ({ value: dateTime(r.apt.created_at), type: String }) },
  { title: 'Actualizada', width: 17, cell: r => ({ value: dateTime(r.apt.updated_at), type: String }) },
]

// --- Excel ---------------------------------------------------------------

const HEADER_STYLE = {
  fontWeight: 'bold',
  backgroundColor: '#1b99d3',
  textColor: '#ffffff',
  align: 'center',
  alignVertical: 'center',
  wrap: true,
  height: 28,
} as const

async function toXlsxBlob(rows: ReportRow[], sheet: string): Promise<Blob> {
  // Import dinamico: la libreria solo entra al bundle cuando se pide el informe.
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const columns = COLUMNS.map(c => ({
    header: { value: c.title, ...HEADER_STYLE },
    width: c.width,
    cell: c.cell,
  }))
  return await writeXlsxFile(rows, {
    columns,
    sheet,
    stickyRowsCount: 1,
  } as any).toBlob()
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// --- Datos ---------------------------------------------------------------

/**
 * Pide las citas desde el dia anterior al inicio del mes (por si `after` es
 * exclusivo en la API) y filtra el rango exacto en el cliente.
 */
async function fetchMonthAppointments(start: Date, end: Date): Promise<AppointmentApiResponse[]> {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  if (!authStore.token) throw new Error('No hay sesion activa')

  const after = new Date(start)
  after.setDate(after.getDate() - 1)

  const data = await $fetch<AppointmentApiResponse[]>(
    `${config.public.apiBaseUrl}/staff/appointments`,
    {
      params: { after: ymd(after), roles: 'sales_agent,listing_agent,admin' },
      headers: { Authorization: `Bearer ${authStore.token}` },
    }
  )

  return data.filter(apt => {
    if (apt.status === 'deleted') return false
    const d = new Date(apt.appointment_date)
    return d >= start && d < end
  })
}

export function useAppointmentReport() {
  const loading = ref(false)
  /** Cual informe se pidio de ultimas, para ubicar el estado en su boton. */
  const running = ref<AppointmentReportPeriod | null>(null)
  const error = ref(false)

  /** Informe del mes con todas las citas de todos los asesores, sin importar los filtros en pantalla. */
  async function downloadReport(period: AppointmentReportPeriod) {
    if (loading.value) return

    loading.value = true
    running.value = period
    error.value = false

    try {
      const agendaStore = useAgendaStore()
      const { start, end } = monthRange(period)

      const [appointments] = await Promise.all([
        fetchMonthAppointments(start, end),
        agendaStore.advisors.length ? Promise.resolve() : agendaStore.fetchAdvisors(),
      ])

      const rows: ReportRow[] = appointments
        .map(apt => ({
          advisor: agendaStore.getAdvisorById(String(apt.user_id))?.name ?? `Usuario #${apt.user_id}`,
          date: new Date(apt.appointment_date),
          apt,
        }))
        .sort((a, b) =>
          a.advisor.localeCompare(b.advisor, 'es') || a.date.getTime() - b.date.getTime()
        )

      const label = monthLabel(period)
      const blob = await toXlsxBlob(rows, `Citas ${label}`)
      downloadBlob(`informe-citas-${ymd(start).slice(0, 7)}.xlsx`, blob)
    } catch (e) {
      console.error(`Error al generar el informe de citas (${period}):`, e)
      error.value = true
    } finally {
      loading.value = false
    }
  }

  return { loading, running, error, downloadReport }
}
