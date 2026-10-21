<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useNow } from '@vueuse/core'
import { ArrowRight, Columns3, List, RefreshCw } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { matchesAssignees, matchesFilters } from '~/lib/maintenanceView'
import type { MaintenanceStatus, QuickFilterKey } from '~/types/maintenance'

definePageMeta({ layout: 'default' })

const {
  openRequests, openLoading, openError, openTruncated,
  closedRequests, closedLoading, closedError, closedHasMore,
  filters, setFilters, fetchOpen, fetchClosed, fetchStaff, myUserId, applyDefaultView, findRequest,
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

/**
 * Los indicadores cuentan dentro del filtro de responsable (por defecto "Mias"
 * + "Sin asignar"), para que el numero coincida con lo que se ve al hacer clic.
 * La busqueda, la prioridad y la ciudad no los afectan.
 */
const scopedOpen = computed(() =>
  openRequests.value.filter(r => matchesAssignees(r, filters.value.assignees))
)

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
  () => [closedVisible.value, filters.value.q, filters.value.priority, filters.value.assignees, filters.value.city] as const,
  ([visible]) => { if (visible) fetchClosed({ reset: true }) },
  { deep: true },
)

/**
 * La API solo filtra por un responsable a la vez. Con varios (p. ej. "Mias" +
 * "Sin asignar") se piden sin ese filtro y se aplica aqui.
 */
const filteredClosed = computed(() =>
  filters.value.assignees.length > 1
    ? closedRequests.value.filter(r => matchesAssignees(r, filters.value.assignees))
    : closedRequests.value
)

// Vista por defecto: "Mias" + "Sin asignar". El id puede llegar despues del
// montaje (sesiones antiguas lo resuelven con /staff/users).
watch(myUserId, () => applyDefaultView(), { immediate: true })

const selectedRequest = computed(() =>
  selectedId.value === null ? null : findRequest(selectedId.value)
)

function select(requestId: number) {
  selectedId.value = requestId
  drawerOpen.value = true
}

watch(drawerOpen, (isOpen) => { if (!isOpen) selectedId.value = null })

// ─── Mover tarjetas entre columnas ──────────────────────────────────────────
const moveDialogOpen = ref(false)
const moveRequestId = ref<number | null>(null)
const moveOptions = ref<MaintenanceStatus[]>([])

const moveRequest = computed(() =>
  openRequests.value.find(r => r.id === moveRequestId.value) ?? null
)

/** Toda columna lleva a un estado: se confirma con nota opcional. */
function onMove(requestId: number, statuses: MaintenanceStatus[]) {
  moveRequestId.value = requestId
  moveOptions.value = statuses
  moveDialogOpen.value = true
}

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
      :requests="scopedOpen"
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
        @move="onMove"
      />
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs text-harbor-black/50">
          Arrastra una tarjeta a otra columna para cambiar su estado. Cada cambio queda en la bitacora.
        </p>
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
      :closed-requests="filteredClosed"
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

    <MaintenanceStatusChangeDialog
      v-model:open="moveDialogOpen"
      :request="moveRequest"
      :preset="moveOptions[0] ?? null"
      :options="moveOptions"
    />

    <MaintenanceRequestDrawer
      v-model:open="drawerOpen"
      :request="selectedRequest"
      :now="now"
      @select="select"
    />
  </div>
</template>
