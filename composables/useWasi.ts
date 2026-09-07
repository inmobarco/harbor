import type { Property, PropertyFilters, WasiPropertySearchResponse, WasiZone } from '~/types/property'

/** Wasi devuelve la lista como claves numericas + `total` y `status`. */
export function unwrapWasiList(response: WasiPropertySearchResponse): { items: Property[]; total: number } {
  const { total, status, ...items } = response as any
  return { items: Object.values(items) as Property[], total: Number(total) || 0 }
}

const MAX_PAGES = 200

export function useWasi() {
  async function searchProperties(skip = 0, take = 100, filters: PropertyFilters = {}) {
    const body: Record<string, any> = { skip, take, short: true }

    // Solo incluir filtros con valor
    if (filters.match) body.match = filters.match
    if (filters.id_property) body.id_property = filters.id_property
    if (filters.min_bedrooms) body.min_bedrooms = filters.min_bedrooms
    if (filters.bathrooms) body.bathrooms = filters.bathrooms
    if (filters.garages) body.garages = filters.garages
    if (filters.max_price) body.max_price = filters.max_price
    if (filters.min_area) body.min_area = filters.min_area
    if (filters.id_city) body.id_city = filters.id_city
    if (filters.id_zone) body.id_zone = filters.id_zone
    if (filters.id_status_on_page !== undefined) body.id_status_on_page = filters.id_status_on_page

    return await $fetch<WasiPropertySearchResponse>('/api/wasi/properties', {
      method: 'POST',
      body,
    })
  }

  /**
   * Recorre todas las paginas que coincidan con los filtros y devuelve el
   * listado completo. No toca el store.
   */
  async function searchAllProperties(
    filters: PropertyFilters = {},
    opts: { pageSize?: number; onProgress?: (p: { loaded: number; total: number }) => void } = {}
  ): Promise<Property[]> {
    const pageSize = opts.pageSize ?? 50
    const all: Property[] = []
    let total = 0

    for (let i = 0; i < MAX_PAGES; i++) {
      const response = await searchProperties(i * pageSize, pageSize, filters)
      const { items, total: t } = unwrapWasiList(response)
      total = t
      if (!items.length) break

      all.push(...items)
      opts.onProgress?.({ loaded: all.length, total })
      if (all.length >= total) break
    }

    return all
  }

  async function fetchZones(cityId: string) {
    return await $fetch<WasiZone[]>(`/api/wasi/zones/${cityId}`)
  }

  return { searchProperties, searchAllProperties, fetchZones }
}
