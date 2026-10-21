import { computed } from 'vue'
import { useMaintenanceStore } from '~/stores/maintenance'
import { ADVISOR_COLORS } from '~/types/advisor'
import type { MaintenanceRequest } from '~/types/maintenance'

export function useMaintenance() {
  const store = useMaintenanceStore()

  /** Color del avatar: el de /staff/users si lo tiene; si no, uno fijo por id. */
  function assigneeColor(userId: number | null): string | null {
    if (userId === null) return null
    const member = store.staff.find(s => s.id === userId)
    return member?.color || ADVISOR_COLORS[userId % ADVISOR_COLORS.length]
  }

  /**
   * Responsables con solicitudes en curso, para los chips de filtro. Sale de los
   * datos y no de /staff/users, asi tambien aparecen asignados que no son manager.
   */
  const activeAssignees = computed(() => {
    const byId = new Map<number, { id: number; name: string; count: number }>()
    for (const r of store.openRequests as MaintenanceRequest[]) {
      if (r.assignedUserId === null) continue
      const entry = byId.get(r.assignedUserId)
      if (entry) entry.count++
      else byId.set(r.assignedUserId, { id: r.assignedUserId, name: r.assignedUserName ?? `Usuario ${r.assignedUserId}`, count: 1 })
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  })

  return {
    // State
    openRequests: computed(() => store.openRequests),
    openLoading: computed(() => store.openLoading),
    openError: computed(() => store.openError),
    openTruncated: computed(() => store.openTruncated),
    closedRequests: computed(() => store.closedRequests),
    closedLoading: computed(() => store.closedLoading),
    closedError: computed(() => store.closedError),
    closedHasMore: computed(() => store.closedHasMore),
    filters: computed(() => store.filters),
    staff: computed(() => store.staff),
    // Derived
    myUserId: computed(() => store.myUserId),
    openSubmissionCounts: computed(() => store.openSubmissionCounts),
    submissions: computed(() => store.submissions),
    activeAssignees,
    assigneeColor,
    // Actions
    fetchOpen: store.fetchOpen,
    fetchClosed: store.fetchClosed,
    fetchStaff: store.fetchStaff,
    setFilters: store.setFilters,
    resetFilters: store.resetFilters,
    applyDefaultView: store.applyDefaultView,
    fetchAttachments: store.fetchAttachments,
    fetchDetail: store.fetchDetail,
    fetchEvents: store.fetchEvents,
    updateRequest: store.updateRequest,
    addNote: store.addNote,
    fetchSubmission: store.fetchSubmission,
    findRequest: store.findRequest,
  }
}
