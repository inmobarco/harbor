<script setup lang="ts">
import { computed, ref } from 'vue'
import { compareDefault } from '~/lib/maintenanceView'
import { BOARD_COLUMNS } from '~/types/maintenance'
import type { MaintenanceRequest, MaintenanceStatus } from '~/types/maintenance'

const props = defineProps<{
  /** Abiertas ya filtradas. */
  requests: MaintenanceRequest[]
  now: number
  selectedId: number | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  select: [requestId: number]
  /** Tarjeta soltada en otra columna: el padre confirma el cambio de estado. */
  move: [requestId: number, statuses: MaintenanceStatus[]]
}>()

// ─── Arrastrar y soltar (API nativa del navegador, sin dependencias) ────────
const draggingId = ref<number | null>(null)
const overColumn = ref<string | null>(null)

function onDragStart(e: DragEvent, requestId: number) {
  draggingId.value = requestId
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    // Firefox no inicia el arrastre si no hay datos
    e.dataTransfer.setData('text/plain', String(requestId))
  }
}

function onDragEnd() {
  draggingId.value = null
  overColumn.value = null
}

function onDragOver(e: DragEvent, colKey: string) {
  if (draggingId.value === null) return
  e.preventDefault()
  overColumn.value = colKey
}

function onDragLeave(e: DragEvent, colKey: string) {
  const related = e.relatedTarget as Node | null
  if (overColumn.value === colKey && !(e.currentTarget as HTMLElement).contains(related)) {
    overColumn.value = null
  }
}

function onDrop(e: DragEvent, statuses: MaintenanceStatus[]) {
  e.preventDefault()
  const id = draggingId.value
  onDragEnd()
  if (id === null) return
  const request = props.requests.find(r => r.id === id)
  // Soltar en la misma columna no cambia nada
  if (!request || statuses.includes(request.status as MaintenanceStatus)) return
  emit('move', id, statuses)
}

const columns = computed(() =>
  BOARD_COLUMNS.map(col => {
    const items = props.requests
      .filter(r => col.statuses.includes(r.status as MaintenanceStatus))
      .sort(compareDefault)
    return {
      ...col,
      items,
      subCounts: col.statuses.length > 1
        ? col.statuses.map(s => ({ status: s, count: items.filter(r => r.status === s).length }))
        : [],
    }
  })
)
</script>

<template>
  <div>
    <p v-if="error" class="mb-3 text-sm text-harbor-error">{{ error }}</p>

    <div class="overflow-x-auto pb-2">
      <div class="grid grid-cols-[repeat(5,minmax(220px,1fr))] gap-3 items-start">
        <section
          v-for="col in columns"
          :key="col.key"
          class="flex flex-col min-h-[240px] rounded-xl border transition-colors"
          :class="overColumn === col.key
            ? 'border-dashed border-harbor-blue bg-harbor-blue/10'
            : 'border-harbor-gray/70 bg-harbor-neutral-white'"
          :aria-label="col.title"
          @dragover="onDragOver($event, col.key)"
          @dragleave="onDragLeave($event, col.key)"
          @drop="onDrop($event, col.statuses)"
        >
          <header class="flex flex-col gap-1.5 px-3 pt-3 pb-2">
            <div class="flex items-center justify-between gap-2">
              <h3 class="flex items-center gap-2 text-sm font-bold text-harbor-black">
                <span class="h-2 w-2 rounded-full" :class="col.dotClass" />
                {{ col.title }}
              </h3>
              <span class="rounded-full bg-harbor-surface-gray px-2 text-xs font-bold tabular-nums text-harbor-black/60">
                {{ col.items.length }}
              </span>
            </div>
            <p class="text-xs text-harbor-black/50">{{ col.hint }}</p>
            <div v-if="col.subCounts.length" class="flex flex-wrap gap-1.5">
              <MaintenanceStatusPill v-for="sc in col.subCounts" :key="sc.status" :status="sc.status">
                &nbsp;{{ sc.count }}
              </MaintenanceStatusPill>
            </div>
          </header>

          <div class="flex flex-col gap-2 px-2 pb-3 pt-1">
            <MaintenanceBoardCard
              v-for="r in col.items"
              :key="r.id"
              :request="r"
              :now="now"
              :selected="r.id === selectedId"
              :show-status="col.statuses.length > 1"
              :dragging="draggingId === r.id"
              @select="emit('select', r.id)"
              @dragstart="onDragStart($event, r.id)"
              @dragend="onDragEnd"
            />
            <div
              v-if="!col.items.length"
              class="rounded-lg border-[1.5px] border-dashed border-harbor-gray px-4 py-5 text-center text-xs text-harbor-black/40"
            >
              {{ loading ? 'Cargando...' : 'Nada aqui con estos filtros' }}
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
