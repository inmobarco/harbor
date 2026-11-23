import { computed } from 'vue'
import { useAcquisitionsStore } from '~/stores/acquisitions'
import { useAuthStore } from '~/stores/auth'
import { buildAdvisorRows, countByBusinessType, inRange, weekRange } from '~/lib/acquisitions'
import { ACQUISITIONS_ROLES } from '~/types/acquisition'

export function useAcquisitions() {
  const store = useAcquisitionsStore()
  const authStore = useAuthStore()

  const canView = computed(() => {
    const role = authStore.user?.role
    return !!role && ACQUISITIONS_ROLES.includes(role)
  })

  /** Referencia temporal: la hora de la ultima carga (o ahora, antes de cargar) */
  const reference = computed(() => (store.loadedAt ? new Date(store.loadedAt) : new Date()))

  const currentWeek = computed(() => weekRange(0, reference.value))
  const previousWeek = computed(() => weekRange(-1, reference.value))

  const currentList = computed(() => store.acquisitions.filter(a => inRange(a.date, currentWeek.value)))
  const previousList = computed(() => store.acquisitions.filter(a => inRange(a.date, previousWeek.value)))

  /**
   * Captaciones de la semana pasada hasta el mismo dia de la semana que hoy
   * (inclusive), para comparar el ritmo y no una semana en curso contra una completa.
   */
  const previousToDate = computed(() => {
    const now = reference.value
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    return previousList.value.filter(a => a.date < cutoff).length
  })

  const rows = computed(() =>
    buildAdvisorRows(store.acquisitions, store.roster, currentWeek.value, previousWeek.value),
  )

  const activeAdvisors = computed(() => rows.value.filter(r => r.current.length > 0).length)

  return {
    canView,
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    hasData: computed(() => store.loadedAt > 0),
    currentWeek,
    previousWeek,
    currentTotal: computed(() => currentList.value.length),
    previousTotal: computed(() => previousList.value.length),
    previousToDate,
    currentByType: computed(() => countByBusinessType(currentList.value)),
    previousByType: computed(() => countByBusinessType(previousList.value)),
    rows,
    activeAdvisors,
    fetchAcquisitions: store.fetchAcquisitions,
    ensureLoaded: store.ensureLoaded,
  }
}
