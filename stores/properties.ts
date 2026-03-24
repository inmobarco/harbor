import { defineStore } from 'pinia'
import type { Property, PropertyFilters } from '~/types/property'

const PAGE_SIZE = 100

export const usePropertiesStore = defineStore('properties', () => {
  const properties = ref<Property[]>([])
  const loading = ref(false)
  const total = ref(0)
  const page = ref(1)
  const filters = ref<PropertyFilters>({})

  const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

  async function fetchProperties(p = 1) {
    const { searchProperties } = useWasi()
    loading.value = true
    try {
      const skip = (p - 1) * PAGE_SIZE
      const response = await searchProperties(skip, PAGE_SIZE, filters.value)
      const { total: t, status, ...items } = response as any
      total.value = t
      page.value = p
      properties.value = Object.values(items) as Property[]
    } finally {
      loading.value = false
    }
  }

  function applyFilters(newFilters: PropertyFilters) {
    filters.value = { ...newFilters }
    fetchProperties(1)
  }

  function clearFilters() {
    filters.value = {}
    fetchProperties(1)
  }

  return { properties, loading, total, page, totalPages, filters, fetchProperties, applyFilters, clearFilters }
})
