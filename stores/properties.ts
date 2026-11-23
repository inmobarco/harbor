import { defineStore } from 'pinia'
import type { Property, PropertyFilters } from '~/types/property'

const PAGE_SIZE = 100 // tamaño de pagina en pantalla
const FETCH_SIZE = 100 // maximo que acepta Wasi por request
const CONCURRENCY = 4 // requests simultaneos a Wasi
const CACHE_TTL = 1000 * 60 * 5 // 5 minutos

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

interface Dataset {
  items: Property[]
  /** Total que reporta Wasi para estos filtros */
  total: number
  complete: boolean
  loadedAt: number
}

/**
 * Wasi no busca por referencia (`match` es texto libre), asi que la busqueda
 * por referencia se hace en cliente. Para que cubra todas las propiedades y no
 * solo la pagina visible, se descarga el listado completo de cada combinacion
 * de filtros de servidor y la paginacion pasa a ser local.
 */
export const usePropertiesStore = defineStore('properties', () => {
  const filters = ref<PropertyFilters>({})
  const baseFilters = ref<PropertyFilters>({})
  const referenceSearch = ref('')
  const page = ref(1)

  // Un dataset por combinacion de filtros de servidor (activas, inactivas,
  // ciudad X...). Cambiar de pestaña no vuelve a descargar.
  const datasets = shallowReactive(new Map<string, Dataset>())
  const inflight = new Map<string, Promise<void>>()
  const loadingKeys = shallowReactive(new Set<string>())

  function keyFor(base: PropertyFilters, f: PropertyFilters): string {
    return JSON.stringify({ ...base, ...f })
  }

  const currentKey = computed(() => keyFor(baseFilters.value, filters.value))
  const current = computed(() => datasets.get(currentKey.value))

  const properties = computed(() => current.value?.items ?? [])
  const loading = computed(() => loadingKeys.has(currentKey.value))
  /** Cuantas trae Wasi en total vs. cuantas van descargadas */
  const serverTotal = computed(() => current.value?.total ?? 0)
  const loadedCount = computed(() => properties.value.length)
  const complete = computed(() => current.value?.complete ?? false)

  const filteredProperties = computed(() => {
    const q = normalize(referenceSearch.value.trim())
    if (!q) return properties.value
    const matches = properties.value.filter(p =>
      normalize(p.reference || '').includes(q)
      || normalize(p.registration_number || '').includes(q),
    )
    // Coincidencia exacta de referencia primero (1005 antes que 10050)
    return matches.sort((a, b) => {
      const ea = normalize(a.reference || '') === q ? 0 : 1
      const eb = normalize(b.reference || '') === q ? 0 : 1
      return ea - eb
    })
  })

  const total = computed(() =>
    referenceSearch.value.trim() ? filteredProperties.value.length : serverTotal.value,
  )
  const totalPages = computed(() => Math.max(1, Math.ceil(filteredProperties.value.length / PAGE_SIZE)))
  const pagedProperties = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return filteredProperties.value.slice(start, start + PAGE_SIZE)
  })

  // Si el filtro reduce el resultado, no quedarse en una pagina vacia
  watch(totalPages, (n) => {
    if (page.value > n) page.value = n
  })

  function dedupe(items: Property[]): Property[] {
    const seen = new Set<number>()
    return items.filter((p) => {
      if (seen.has(p.id_property)) return false
      seen.add(p.id_property)
      return true
    })
  }

  async function loadAll(key: string, merged: PropertyFilters) {
    const { searchProperties } = useWasi()
    // Si ya hay datos (refresh), se siguen mostrando hasta que llegue el nuevo
    // listado completo. Si no, se van mostrando a medida que llegan.
    const progressive = !datasets.get(key)?.items.length

    loadingKeys.add(key)
    try {
      const first = unwrapWasiList(await searchProperties(0, FETCH_SIZE, merged))
      const totalCount = first.total
      const chunks: Property[][] = [first.items]

      const publish = (done: boolean) => {
        datasets.set(key, {
          items: dedupe(chunks.flat()),
          total: totalCount,
          complete: done,
          loadedAt: Date.now(),
        })
      }
      if (progressive) publish(false)

      const offsets: number[] = []
      for (let skip = FETCH_SIZE; skip < totalCount; skip += FETCH_SIZE) offsets.push(skip)

      let next = 0
      const worker = async () => {
        while (next < offsets.length) {
          const idx = next++
          const res = unwrapWasiList(await searchProperties(offsets[idx], FETCH_SIZE, merged))
          chunks[idx + 1] = res.items // conserva el orden de Wasi
          if (progressive) publish(false)
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, offsets.length) }, worker))

      publish(true)
    } finally {
      loadingKeys.delete(key)
    }
  }

  function load(base: PropertyFilters, f: PropertyFilters, force = false): Promise<void> {
    const key = keyFor(base, f)
    const ds = datasets.get(key)
    if (!force && ds?.complete && Date.now() - ds.loadedAt < CACHE_TTL) return Promise.resolve()

    const running = inflight.get(key)
    if (running) return running

    const promise = loadAll(key, { ...base, ...f }).finally(() => inflight.delete(key))
    inflight.set(key, promise)
    return promise
  }

  /** Carga el listado de los filtros actuales si no esta fresco en cache. */
  function ensureLoaded() {
    return load(baseFilters.value, filters.value)
  }

  /** Vuelve a descargar los filtros actuales (p. ej. tras editar). */
  function refresh() {
    return load(baseFilters.value, filters.value, true)
  }

  /** Precarga las activas sin filtros: es lo que mas se consulta. */
  function preloadActive() {
    return load({}, {})
  }

  function setBaseFilters(f: PropertyFilters) {
    baseFilters.value = f
  }

  function setPage(p: number) {
    page.value = Math.min(Math.max(1, p), totalPages.value)
  }

  function setReferenceSearch(q: string) {
    referenceSearch.value = q
    page.value = 1
  }

  function applyFilters(newFilters: PropertyFilters, refSearch: string = '') {
    filters.value = { ...newFilters }
    setReferenceSearch(refSearch)
    ensureLoaded().catch(() => {})
  }

  function clearFilters() {
    filters.value = {}
    setReferenceSearch('')
    ensureLoaded().catch(() => {})
  }

  return {
    properties,
    filteredProperties,
    pagedProperties,
    loading,
    complete,
    total,
    serverTotal,
    loadedCount,
    page,
    totalPages,
    filters,
    baseFilters,
    referenceSearch,
    setBaseFilters,
    setPage,
    setReferenceSearch,
    ensureLoaded,
    refresh,
    preloadActive,
    applyFilters,
    clearFilters,
  }
})
