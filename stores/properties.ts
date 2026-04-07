import { defineStore } from 'pinia'
import type { Property, PropertyFilters } from '~/types/property'

const PAGE_SIZE = 100

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

  function setBaseFilters(f: PropertyFilters) {
    baseFilters.value = f
  }

  async function fetchProperties(p = 1) {
    const { searchProperties } = useWasi()
    loading.value = true
    try {
      const skip = (p - 1) * PAGE_SIZE
      const merged = { ...baseFilters.value, ...filters.value }
      const response = await searchProperties(skip, PAGE_SIZE, merged)
      const { total: t, status, ...items } = response as any
      total.value = t
      page.value = p
      properties.value = Object.values(items) as Property[]
    } finally {
      loading.value = false
    }
  }

  function applyFilters(newFilters: PropertyFilters, refSearch: string = '') {
    filters.value = { ...newFilters }
    referenceSearch.value = refSearch
    fetchProperties(1)
  }

  function clearFilters() {
    filters.value = {}
    referenceSearch.value = ''
    fetchProperties(1)
  }

  return { properties, filteredProperties, loading, total, page, totalPages, filters, baseFilters, referenceSearch, setBaseFilters, fetchProperties, applyFilters, clearFilters }
})
