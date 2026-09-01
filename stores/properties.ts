import { defineStore } from 'pinia'
import type { Property, PropertyFilters } from '~/types/property'

const PAGE_SIZE = 100
const CACHE_TTL = 1000 * 60 * 5 // 5 minutos

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export const usePropertiesStore = defineStore('properties', () => {
  const properties = ref<Property[]>([])
  const loading = ref(false)
  const total = ref(0)
  const page = ref(1)
  const filters = ref<PropertyFilters>({})
  const baseFilters = ref<PropertyFilters>({})
  const referenceSearch = ref('')

  // Cache de una sola entrada: clave del ultimo request resuelto + timestamp
  const lastKey = ref<string | null>(null)
  const loadedAt = ref(0)

  // Dedup de requests en vuelo (evita que la precarga y el mount de la pagina
  // disparen la misma llamada dos veces)
  let inflight: Promise<void> | null = null
  let inflightKey: string | null = null

  const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

  const filteredProperties = computed(() => {
    if (!referenceSearch.value) return properties.value
    const query = normalize(referenceSearch.value)
    return properties.value.filter(p => {
      const ref = normalize(p.reference || '')
      const regNum = normalize(p.registration_number || '')
      return ref.includes(query) || regNum.includes(query)
    })
  })

  // referenceSearch no entra en la clave: filtra en cliente, no afecta el request
  function requestKey(p: number): string {
    return JSON.stringify({ ...baseFilters.value, ...filters.value, p })
  }

  function setBaseFilters(f: PropertyFilters) {
    baseFilters.value = f
  }

  async function runFetch(p: number, key: string) {
    loading.value = true
    try {
      const { searchProperties } = useWasi()
      const skip = (p - 1) * PAGE_SIZE
      const merged = { ...baseFilters.value, ...filters.value }
      const response = await searchProperties(skip, PAGE_SIZE, merged)
      const { total: t, status, ...items } = response as any
      total.value = t
      page.value = p
      properties.value = Object.values(items) as Property[]
      lastKey.value = key
      loadedAt.value = Date.now()
    } finally {
      loading.value = false
    }
  }

  /** Fuerza el fetch, ignorando el cache. Usado por la paginacion. */
  async function fetchProperties(p = 1) {
    const key = requestKey(p)
    if (inflight && inflightKey === key) return inflight

    inflightKey = key
    inflight = runFetch(p, key).finally(() => {
      inflight = null
      inflightKey = null
    })
    return inflight
  }

  /** Fetch solo si no hay datos frescos para esa combinacion de filtros. */
  async function ensureLoaded(p = 1) {
    const key = requestKey(p)
    if (lastKey.value === key && Date.now() - loadedAt.value < CACHE_TTL) return
    return fetchProperties(p)
  }

  function applyFilters(newFilters: PropertyFilters, refSearch: string = '') {
    filters.value = { ...newFilters }
    referenceSearch.value = refSearch
    ensureLoaded(1)
  }

  function clearFilters() {
    filters.value = {}
    referenceSearch.value = ''
    ensureLoaded(1)
  }

  return {
    properties,
    filteredProperties,
    loading,
    total,
    page,
    totalPages,
    filters,
    baseFilters,
    referenceSearch,
    setBaseFilters,
    fetchProperties,
    ensureLoaded,
    applyFilters,
    clearFilters,
  }
})
