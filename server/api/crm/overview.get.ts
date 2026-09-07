// Agrega el resumen de clientes por asesor en el servidor.
//
// Con N asesores el navegador haria N+2 llamadas (y cada /client/search puede
// necesitar varias paginas). Esta ruta abanica en paralelo y devuelve una sola
// respuesta lista para pintar.
//
//   1. GET {API_BASE}/staff/crm/advisor-map     (reenviando el Bearer del usuario)
//   2. GET {API_BASE}/staff/users               (para el color de cada asesor)
//   3. GET /v1/client/search?id_property=...    (paginado take=100, por asesor)

import type {
  AdvisorMapEntry,
  CrmAdvisorOverview,
  CrmAdvisorStats,
  CrmClient,
  CrmOverviewResponse,
  CrmStatusCount,
  WasiClient,
} from '~/types/crm'
import { CLIENT_STATUS_ORDER } from '~/types/crm'
import type { AdvisorApiResponse } from '~/types/advisor'
import { ADVISOR_COLORS } from '~/types/advisor'

const WASI_PAGE_SIZE = 100
const WASI_MAX_PAGES = 20
const CLIENTS_PER_ADVISOR = 5
const STALE_DAYS = 30
const ACTIVE_STATUS_IDS = [1, 2] // Nuevo, En Proceso

export default defineEventHandler(async (event): Promise<CrmOverviewResponse> => {
  const config = useRuntimeConfig()
  const authorization = getRequestHeader(event, 'authorization')

  if (!authorization) {
    throw createError({ statusCode: 401, statusMessage: 'Falta el token de sesion' })
  }

  const apiBase = String(config.public.apiBaseUrl || '').trim().replace(/\/+$/, '')
  const wasiBase = String(config.public.wasiApiUrl || 'https://api.wasi.co/v1').trim().replace(/\/+$/, '')
  const wasiAuth = {
    id_company: config.public.wasiApiId,
    wasi_token: config.public.wasiApiToken,
  }

  const [map, users] = await Promise.all([
    fetchAdvisorMap(apiBase, authorization),
    fetchAdvisorColors(apiBase, authorization),
  ])

  const results = await Promise.all(
    map.map(async (entry, index): Promise<CrmAdvisorOverview> => {
      const advisor = {
        id: String(entry.user_id),
        name: [entry.first_name, entry.last_name].filter(Boolean).join(' ').trim() || `Asesor ${entry.user_id}`,
        color: users[String(entry.user_id)] || ADVISOR_COLORS[index % ADVISOR_COLORS.length],
        idPropertyWasi: entry.id_property_wasi || null,
      }

      if (!advisor.idPropertyWasi) {
        return { advisor, clients: [], stats: emptyStats(), error: 'El asesor no tiene propiedad dummy asignada' }
      }

      try {
        const { clients, total } = await fetchClientsForProperty(wasiBase, wasiAuth, advisor.idPropertyWasi)
        const normalized = clients.map(normalizeClient)
        return {
          advisor,
          clients: sortByCreatedDesc(normalized).slice(0, CLIENTS_PER_ADVISOR),
          stats: buildStats(normalized, total),
          error: null,
        }
      } catch (err: any) {
        console.error(`[crm/overview] Wasi fallo para id_property=${advisor.idPropertyWasi}:`, err?.message || err)
        return { advisor, clients: [], stats: emptyStats(), error: 'No se pudieron cargar los clientes desde Wasi' }
      }
    })
  )

  const advisors = results.sort((a, b) => b.stats.active - a.stats.active || a.advisor.name.localeCompare(b.advisor.name))

  return {
    advisors,
    totals: {
      advisors: advisors.length,
      clients: advisors.reduce((sum, a) => sum + a.stats.total, 0),
      active: advisors.reduce((sum, a) => sum + a.stats.active, 0),
      staleOver30d: advisors.reduce((sum, a) => sum + a.stats.staleOver30d, 0),
    },
    generatedAt: new Date().toISOString(),
  }
})

async function fetchAdvisorMap(apiBase: string, authorization: string): Promise<AdvisorMapEntry[]> {
  try {
    const data = await $fetch<AdvisorMapEntry[]>(`${apiBase}/staff/crm/advisor-map`, {
      headers: { Authorization: authorization },
    })
    return Array.isArray(data) ? data : []
  } catch (err: any) {
    const status = err?.response?.status ?? err?.statusCode
    if (status === 404) {
      throw createError({
        statusCode: 503,
        statusMessage: 'La API todavia no expone GET /staff/crm/advisor-map',
      })
    }
    if (status === 403) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Tu rol no tiene permiso para ver el mapa de asesores',
      })
    }
    throw createError({
      statusCode: status && status >= 400 && status < 600 ? status : 502,
      statusMessage: err?.data?.detail || 'Error consultando el mapa de asesores',
    })
  }
}

/** Colores de asesor desde /staff/users. No es critico: si falla se usa el fallback. */
async function fetchAdvisorColors(apiBase: string, authorization: string): Promise<Record<string, string>> {
  try {
    const users = await $fetch<AdvisorApiResponse[]>(`${apiBase}/staff/users`, {
      params: { roles: 'sales_agent,listing_agent,admin' },
      headers: { Authorization: authorization },
    })
    return Object.fromEntries(users.filter(u => u.color).map(u => [String(u.id), u.color]))
  } catch {
    return {}
  }
}

async function fetchClientsForProperty(
  wasiBase: string,
  wasiAuth: Record<string, unknown>,
  idProperty: string
): Promise<{ clients: WasiClient[]; total: number }> {
  const clients: WasiClient[] = []
  let total = 0

  for (let page = 0; page < WASI_MAX_PAGES; page++) {
    const response = await $fetch<Record<string, unknown>>(`${wasiBase}/client/search`, {
      params: {
        ...wasiAuth,
        id_property: idProperty,
        skip: page * WASI_PAGE_SIZE,
        take: WASI_PAGE_SIZE,
        order_by: 'created_at',
        order: 'desc',
      },
    })

    total = Number(response.total ?? 0)
    // Wasi devuelve { total, status, "0": {...}, "1": {...} }
    const items = Object.entries(response)
      .filter(([key]) => /^\d+$/.test(key))
      .map(([, value]) => value as WasiClient)

    clients.push(...items)
    if (items.length < WASI_PAGE_SIZE || clients.length >= total) break
  }

  return { clients, total: total || clients.length }
}

/** Wasi entrega fechas como "2026-02-11 11:16:34" (sin zona) */
function parseWasiDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
}

function daysSince(value: string | null): number | null {
  const date = parseWasiDate(value)
  if (!date) return null
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
}

function normalizeClient(client: WasiClient): CrmClient {
  const name = [client.first_name, client.last_name].filter(Boolean).join(' ').trim()
  return {
    id: client.id_client,
    name: name || 'Sin nombre',
    phone: client.cell_phone || client.phone || null,
    email: client.email || null,
    statusId: client.id_client_status ?? null,
    statusLabel: client.client_status_label || 'Sin estado',
    typeLabel: client.client_type_label || '',
    cityLabel: client.city_label || null,
    createdAt: client.created_at,
    updatedAt: client.updated_at,
    daysSinceUpdate: daysSince(client.updated_at || client.created_at),
  }
}

function sortByCreatedDesc(clients: CrmClient[]): CrmClient[] {
  return [...clients].sort((a, b) => {
    const da = parseWasiDate(a.createdAt)?.getTime() ?? 0
    const db = parseWasiDate(b.createdAt)?.getTime() ?? 0
    return db - da
  })
}

function buildStats(clients: CrmClient[], total: number): CrmAdvisorStats {
  const grouped = new Map<string, CrmStatusCount>()
  for (const client of clients) {
    const existing = grouped.get(client.statusLabel)
    if (existing) {
      existing.count++
    } else {
      grouped.set(client.statusLabel, { statusId: client.statusId, label: client.statusLabel, count: 1 })
    }
  }

  const byStatus = [...grouped.values()].sort((a, b) => statusRank(a.label) - statusRank(b.label))

  const activeClients = clients.filter(c => c.statusId !== null && ACTIVE_STATUS_IDS.includes(c.statusId))

  return {
    total,
    byStatus,
    active: activeClients.length,
    // Solo cuenta activos: un cliente perdido sin novedad no es accionable
    staleOver30d: activeClients.filter(c => c.daysSinceUpdate !== null && c.daysSinceUpdate > STALE_DAYS).length,
    newLast30d: clients.filter(c => {
      const days = daysSince(c.createdAt)
      return days !== null && days <= STALE_DAYS
    }).length,
  }
}

function statusRank(label: string): number {
  const index = CLIENT_STATUS_ORDER.indexOf(label)
  return index === -1 ? 99 : index
}

function emptyStats(): CrmAdvisorStats {
  return { total: 0, byStatus: [], active: 0, staleOver30d: 0, newLast30d: 0 }
}
