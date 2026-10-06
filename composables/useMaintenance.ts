import { computed } from 'vue'
import { useMaintenanceStore } from '~/stores/maintenance'

export function useMaintenance() {
  const store = useMaintenanceStore()

  return {
    // State
    requests: computed(() => store.requests),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    filters: computed(() => store.filters),
    offset: computed(() => store.offset),
    hasMore: computed(() => store.hasMore),
    pageSize: store.pageSize,
    // Actions
    fetchRequests: store.fetchRequests,
    setFilters: store.setFilters,
    resetFilters: store.resetFilters,
    nextPage: store.nextPage,
    prevPage: store.prevPage,
    fetchAttachments: store.fetchAttachments,
  }
}
