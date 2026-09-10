import { computed } from 'vue'
import { useRoutesStore } from '~/stores/routes'
import { useAgendaStore } from '~/stores/agenda'
import { useAuthStore } from '~/stores/auth'
import { ROUTE_MANAGE_ROLES } from '~/types/route'

export function useRoutes() {
  const store = useRoutesStore()
  const agendaStore = useAgendaStore()
  const authStore = useAuthStore()

  /** Los endpoints /staff/scheduling/* exigen admin o manager. */
  const canManageRoutes = computed(() => {
    const role = authStore.user?.role
    return !!role && ROUTE_MANAGE_ROLES.includes(role)
  })

  /** Carga inicial de la vista: rutas, conjuntos y asignaciones en paralelo. */
  async function loadAll() {
    await Promise.all([
      store.fetchRoutes(),
      store.fetchComplexes(),
      store.fetchAssignments(),
    ])
  }

  return {
    // State
    routes: computed(() => store.routes),
    routesLoading: computed(() => store.routesLoading),
    routesError: computed(() => store.routesError),
    selectedRoute: computed(() => store.selectedRoute),
    selectedRouteId: computed(() => store.selectedRouteId),
    detailLoading: computed(() => store.detailLoading),
    detailError: computed(() => store.detailError),
    complexes: computed(() => store.complexes),
    complexesLoading: computed(() => store.complexesLoading),
    complexesError: computed(() => store.complexesError),
    assignments: computed(() => store.assignments),
    assignmentsLoading: computed(() => store.assignmentsLoading),
    assignmentsError: computed(() => store.assignmentsError),
    advisors: computed(() => agendaStore.advisors),
    // Derived
    canManageRoutes,
    selectedRouteAssignments: computed(() => store.assignmentsBySelectedRoute),
    // Actions
    loadAll,
    fetchRoutes: store.fetchRoutes,
    fetchAssignments: store.fetchAssignments,
    selectRoute: store.selectRoute,
    assignmentsFor: store.assignmentsFor,
    createRoute: store.createRoute,
    updateRoute: store.updateRoute,
    deleteRoute: store.deleteRoute,
    createAssignment: store.createAssignment,
    deleteAssignment: store.deleteAssignment,
    getAdvisorById: agendaStore.getAdvisorById,
  }
}
