export interface Property {
  id_property: number
  reference: string | null
  registration_number: string | null
  for_sale: boolean | string
  for_rent: boolean | string
  sale_price_label: string | null
  rent_price_label: string | null
  city_label: string
  zone_label: string | null
  bedrooms: number
  bathrooms: number
  area: number
  garages: number
  tv_share: string | boolean | null
  comment: string | null
  id_status_on_page: number | null
  label: string | null
}

export interface PropertyFilters {
  match?: string
  id_property?: number
  min_bedrooms?: number
  bathrooms?: number
  garages?: number
  max_price?: number
  min_area?: number
  id_city?: string
  id_zone?: number
  id_status_on_page?: number
}

export interface WasiZone {
  id_zone: number
  name: string
  id_city: number
}

export interface WasiPropertySearchResponse {
  [id: string]: Property
}
