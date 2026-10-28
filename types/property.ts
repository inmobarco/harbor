export interface Property {
  id_property: number
  reference: string | null
  registration_number: string | null
  for_sale: boolean | string
  for_rent: boolean | string
  sale_price: string | number | null
  rent_price: string | number | null
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

/** Respuesta de `property/get`: trae los campos completos del inmueble. */
export interface PropertyDetail extends Property {
  built_area: string | number | null
  private_area: string | number | null
  stratum: string | number | null
}

/** Campos modificables desde Harbor. Wasi recibe los booleanos como 'true' / 'false'. */
export interface PropertyUpdate {
  for_sale: 'true' | 'false'
  for_rent: 'true' | 'false'
  area: number
  built_area: number
  private_area: number
  sale_price?: number
  rent_price?: number
  bedrooms: number
  bathrooms: number
  garages: number
  stratum?: number
  tv_share: 'true' | 'false'
}

export const STRATUM_OPTIONS = [
  { value: 1, label: 'Estrato 1' },
  { value: 2, label: 'Estrato 2' },
  { value: 3, label: 'Estrato 3' },
  { value: 4, label: 'Estrato 4' },
  { value: 5, label: 'Estrato 5' },
  { value: 6, label: 'Estrato 6' },
  { value: 7, label: 'Rural' },
  { value: 8, label: 'Comercial' },
] as const

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
