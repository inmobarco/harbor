import { computed } from 'vue'
import { useCrmStore } from '~/stores/crm'
import { useAuthStore } from '~/stores/auth'

/** Estilos por estado de cliente de Wasi (1 Nuevo, 2 En Proceso, 3 Convertido, 5 Perdido) */
const CLIENT_STATUS_STYLES: Record<number, { dot: string; text: string; bg: string }> = {
  1: { dot: 'bg-harbor-info', text: 'text-harbor-info', bg: 'bg-harbor-info/10' },
  2: { dot: 'bg-harbor-warning', text: 'text-amber-600', bg: 'bg-harbor-warning/10' },
  3: { dot: 'bg-harbor-success', text: 'text-emerald-600', bg: 'bg-harbor-success/10' },
  4: { dot: 'bg-harbor-purple', text: 'text-purple-600', bg: 'bg-harbor-purple/10' },
  5: { dot: 'bg-harbor-black/30', text: 'text-harbor-black/50', bg: 'bg-harbor-black/5' },
}

const DEFAULT_STATUS_STYLE = {
  dot: 'bg-harbor-black/30',
  text: 'text-harbor-black/50',
  bg: 'bg-harbor-black/5',
}

export function statusStyle(statusId: number | null) {
  if (statusId === null) return DEFAULT_STATUS_STYLE
  return CLIENT_STATUS_STYLES[statusId] ?? DEFAULT_STATUS_STYLE
}

export function formatRelativeDays(days: number | null): string {
  if (days === null) return 'sin fecha'
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} d`
  const months = Math.floor(days / 30)
  return `hace ${months} mes${months !== 1 ? 'es' : ''}`
}

export function useCrm() {
  const store = useCrmStore()
  const authStore = useAuthStore()

  // /staff/crm/advisor-map es solo admin
  const canViewOverview = computed(() => authStore.user?.role === 'admin')

  return {
    advisors: computed(() => store.advisors),
    totals: computed(() => store.totals),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    canViewOverview,
    fetchOverview: store.fetchOverview,
    ensureLoaded: store.ensureLoaded,
  }
}
