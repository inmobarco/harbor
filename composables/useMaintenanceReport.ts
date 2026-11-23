import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { normalizeMaintenanceEvent, normalizeMaintenanceRequest } from '~/lib/maintenanceMappers'
import {
  buildReportSheets, closedInRange, previousWeekRange, reportFileName,
} from '~/lib/maintenanceReport'
import { CLOSED_STATUSES, OPEN_STATUSES } from '~/types/maintenance'
import type { MaintenanceRequest } from '~/types/maintenance'

/** Tope por pagina del endpoint. */
const PAGE_SIZE = 500

/**
 * Pide todas las paginas de un listado. El informe es de toda la empresa:
 * nunca se aplican los filtros del tablero.
 */
async function fetchAllRequests(query: Record<string, string | number>): Promise<MaintenanceRequest[]> {
  const base = useRuntimeConfig().public.apiBaseUrl
  const rows: MaintenanceRequest[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await apiFetch<any[]>(`${base}/staff/maintenance/requests`, {
      query: { ...query, limit: PAGE_SIZE, offset },
    })
    rows.push(...page.map(normalizeMaintenanceRequest))
    if (page.length < PAGE_SIZE) return rows
  }
}

/**
 * Motivo de cada cancelada: la nota del evento que la paso a cancelada (el
 * backend la exige al cancelar). Una bitacora que falle no detiene el informe;
 * esa fila queda sin motivo.
 */
async function fetchCancelReasons(cancelled: MaintenanceRequest[]): Promise<Map<number, string>> {
  const base = useRuntimeConfig().public.apiBaseUrl
  const reasons = new Map<number, string>()
  const results = await Promise.allSettled(
    cancelled.map(async r => {
      const events = (await apiFetch<any[]>(`${base}/staff/maintenance/requests/${r.id}/events`))
        .map(normalizeMaintenanceEvent)
      const cancel = [...events].reverse().find(e => e.toStatus === 'cancelada')
      if (cancel?.note) reasons.set(r.id, cancel.note)
    })
  )
  const failed = results.filter(x => x.status === 'rejected').length
  if (failed) console.warn(`No se pudo leer el motivo de ${failed} solicitud(es) cancelada(s)`)
  return reasons
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

export function useMaintenanceReport() {
  const loading = ref(false)
  const error = ref(false)

  /**
   * Un solo archivo con tres hojas: resumen para gerencia, solicitudes activas
   * al momento de generarlo, y cerradas/canceladas de la semana calendario
   * anterior (lunes a domingo).
   */
  async function downloadReport() {
    if (loading.value) return
    loading.value = true
    error.value = false

    try {
      const authStore = useAuthStore()
      const now = new Date()
      const range = previousWeekRange(now)

      const [active, recentlyClosed] = await Promise.all([
        fetchAllRequests({ status: OPEN_STATUSES.join(',') }),
        // La API no filtra por fecha de cierre: updated_after acota la consulta
        // (cerrar actualiza updated_at) y el rango exacto se filtra aqui
        fetchAllRequests({ status: CLOSED_STATUSES.join(','), updated_after: range.start.toISOString() }),
      ])
      const closedWeek = recentlyClosed.filter(r => closedInRange(r, range))
      const cancelReasons = await fetchCancelReasons(closedWeek.filter(r => r.status === 'cancelada'))

      const user = authStore.user
      const sheets = buildReportSheets({
        active,
        closedWeek,
        cancelReasons,
        now,
        range,
        generatedBy: user ? `${user.first_name} ${user.last_name}`.trim() : 'Harbor',
      })

      // Import dinamico: la libreria solo entra al bundle cuando se pide el informe
      const { default: writeXlsxFile } = await import('write-excel-file/browser')
      const blob = await writeXlsxFile(sheets as any).toBlob()
      downloadBlob(reportFileName(now), blob)
    } catch (e) {
      console.error('Error al generar el informe de mantenimiento:', e)
      error.value = true
    } finally {
      loading.value = false
    }
  }

  return { loading, error, downloadReport }
}
