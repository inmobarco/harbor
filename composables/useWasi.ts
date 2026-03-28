import type { PropertyFilters, WasiPropertySearchResponse, WasiZone } from '~/types/property'

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

  async function fetchZones(cityId: string) {
    return await $fetch<WasiZone[]>(`/api/wasi/zones/${cityId}`)
  }

  return { searchProperties, fetchZones }
}
