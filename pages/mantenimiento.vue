<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useNow } from '@vueuse/core'
import { ArrowRight, Columns3, List, RefreshCw } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { matchesFilters } from '~/lib/maintenanceView'
import type { QuickFilterKey } from '~/types/maintenance'

definePageMeta({ layout: 'default' })

const {
  openRequests, openLoading, openError, openTruncated,
  closedRequests, closedLoading, closedError, closedHasMore,
  filters, setFilters, fetchOpen, fetchClosed, fetchStaff,
} = useMaintenance()

// La antiguedad y los plazos se recalculan cada minuto sin volver a pedir datos
const nowDate = useNow({ interval: 60_000 })
const now = computed(() => nowDate.value.getTime())

const view = ref<'board' | 'table'>('board')
const includeClosed = ref(true)
const selectedId = ref<number | null>(null)
const drawerOpen = ref(false)

onMounted(() => {
  fetchOpen()
  fetchStaff()
})

const filteredOpen = computed(() =>
  openRequests.value.filter(r => matchesFilters(r, filters.value, now.value))
)

/** Las cerradas solo se piden cuando la tabla las va a mostrar. */
const closedVisible = computed(() =>
  view.value === 'table' && includeClosed.value && filters.value.quick === null
)

// Los filtros de las cerradas los aplica el servidor: recargar desde la primera
// pagina cuando cambian. La busqueda ya llega con debounce desde los filtros.
watch(
  () => [closedVisible.value, filters.value.q, filters.value.priority, filters.value.assignee] as const,
  ([visible]) => { if (visible) fetchClosed({ reset: true }) },
  { deep: true },
)

const selectedRequest = computed(() =>
  openRequests.value.find(r => r.id === selectedId.value)
  ?? closedRequests.value.find(r => r.id === selectedId.value)
  ?? null
)

function select(requestId: number) {
  selectedId.value = requestId
  drawerOpen.value = true
}

watch(drawerOpen, (isOpen) => { if (!isOpen) selectedId.value = null })

function toggleQuick(key: QuickFilterKey) {
  setFilters({ quick: filters.value.quick === key ? null : key })
}

function showClosedInTable() {
  includeClosed.value = true
  view.value = 'table'
}

const refreshing = ref(false)
async function refresh() {
  refreshing.value = true
  try {
    await Promise.all([
      fetchOpen(),
      closedVisible.value ? fetchClosed({ reset: true }) : Promise.resolve(),
    ])
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-harbor-black">Mantenimiento</h1>
        <p class="text-sm text-harbor-black/50 mt-0.5">
          Solicitudes reportadas por propietarios y arrendatarios.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <div class="inline-flex rounded-lg bg-harbor-surface-gray p-0.5" role="tablist" aria-label="Vista">
          <button
            v-for="v in [{ key: 'board', label: 'Tablero', icon: Columns3 }, { key: 'table', label: 'Tabla', icon: List }] as const"
            :key="v.key"
            type="button"
            role="tab"
            :aria-selected="view === v.key"
            class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors"
            :class="view === v.key ? 'bg-harbor-pure-white text-harbor-black shadow-sm' : 'text-harbor-black/60 hover:text-harbor-black'"
            @click="view = v.key"
          >
            <component :is="v.icon" class="h-4 w-4" />
            {{ v.label }}
          </button>
        </div>
        <Button variant="outline" size="sm" :disabled="refreshing || openLoading" @click="refresh">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': refreshing || openLoading }" />
          Actualizar
        </Button>
      </div>
    </div>

    <MaintenanceStatsStrip
      :requests="openRequests"
      :now="now"
      :active="filters.quick"
      @toggle="toggleQuick"
    />

    <MaintenanceRequestFilters />

    <p v-if="openTruncated" class="text-sm text-amber-700">
      Hay mas de 500 solicitudes en curso: se muestran las 500 mas recientes y los indicadores pueden quedarse cortos.
    </p>

    <template v-if="view === 'board'">
      <MaintenanceBoard
        :requests="filteredOpen"
        :now="now"
        :selected-id="selectedId"
        :loading="openLoading"
        :error="openError"
        @select="select"
      />
      <div class="flex justify-end">
        <button
          type="button"
          class="inline-flex items-center gap-1 text-sm font-bold text-harbor-blue-dark hover:underline"
          @click="showClosedInTable"
        >
          Ver cerradas y canceladas en la tabla
          <ArrowRight class="h-4 w-4" />
        </button>
      </div>
    </template>

    <MaintenanceRequestsTable
      v-else
      v-model:include-closed="includeClosed"
      :open-requests="filteredOpen"
      :closed-requests="closedRequests"
      :now="now"
      :selected-id="selectedId"
      :loading="openLoading"
      :error="openError"
      :closed-loading="closedLoading"
      :closed-error="closedError"
      :closed-has-more="closedHasMore"
      :quick-active="filters.quick !== null"
      @select="select"
      @load-more-closed="fetchClosed({ reset: false })"
    />

    <MaintenanceRequestDrawer
      v-model:open="drawerOpen"
      :request="selectedRequest"
      :now="now"
    />
  </div>
</template>
