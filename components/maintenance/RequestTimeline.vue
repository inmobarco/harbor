<script setup lang="ts">
import { computed, ref } from 'vue'
import { Activity, ArrowRight, MessageSquare, Zap } from 'lucide-vue-next'
import { eventKind, formatDate, humanize, metadataEntries } from '~/lib/maintenanceView'
import type { EventKind, MaintenanceEvent } from '~/types/maintenance'

const props = defineProps<{
  events: MaintenanceEvent[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{ retry: [] }>()

const FILTERS: { key: EventKind | 'all'; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'status', label: 'Estados' },
  { key: 'note', label: 'Notas' },
  { key: 'system', label: 'Sistema' },
  { key: 'other', label: 'Otros' },
]

const filter = ref<EventKind | 'all'>('all')

const items = computed(() =>
  props.events.map(e => ({ ...e, kind: eventKind(e), meta: metadataEntries(e.metadata) }))
)

/** Solo se ofrecen los filtros que tienen eventos. */
const availableFilters = computed(() =>
  FILTERS.filter(f => f.key === 'all' || items.value.some(e => e.kind === f.key))
)

/** El backend entrega de la mas antigua a la mas reciente; aqui se lee al reves. */
const visible = computed(() =>
  items.value
    .filter(e => filter.value === 'all' || e.kind === filter.value)
    .reverse()
)

const KIND_STYLES: Record<EventKind, { icon: any; cls: string; label: string }> = {
  status: { icon: ArrowRight, cls: 'bg-harbor-blue/15 text-harbor-blue-dark', label: 'Cambio de estado' },
  note: { icon: MessageSquare, cls: 'bg-harbor-purple/10 text-harbor-purple', label: 'Nota' },
  system: { icon: Zap, cls: 'bg-harbor-surface-gray text-harbor-black/60', label: 'Sistema' },
  other: { icon: Activity, cls: 'bg-harbor-surface-gray text-harbor-black/60', label: '' },
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p v-if="loading && !events.length" class="text-sm text-harbor-black/50">Cargando bitacora...</p>
    <div v-else-if="error" class="flex items-center gap-3">
      <p class="text-sm text-harbor-error">{{ error }}</p>
      <button type="button" class="text-sm font-bold text-harbor-blue-dark hover:underline" @click="emit('retry')">
        Reintentar
      </button>
    </div>
    <p v-else-if="!events.length" class="text-sm text-harbor-black/50">Aun no hay eventos en la bitacora.</p>

    <template v-else>
      <div v-if="availableFilters.length > 2" class="flex flex-wrap gap-1.5">
        <button
          v-for="f in availableFilters"
          :key="f.key"
          type="button"
          class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
          :class="filter === f.key
            ? 'bg-harbor-black border-harbor-black text-white'
            : 'bg-harbor-pure-white border-harbor-gray text-harbor-black/70 hover:border-harbor-black/40'"
          @click="filter = f.key"
        >
          {{ f.label }}
        </button>
      </div>

      <ol class="flex flex-col">
        <li
          v-for="(e, i) in visible"
          :key="e.id"
          class="relative grid grid-cols-[28px_minmax(0,1fr)] gap-2.5 pb-4"
        >
          <span
            v-if="i < visible.length - 1"
            class="absolute left-[13px] top-7 bottom-0 w-0.5 bg-harbor-gray/60"
            aria-hidden="true"
          />
          <span class="grid h-7 w-7 place-items-center rounded-full" :class="KIND_STYLES[e.kind].cls">
            <component :is="KIND_STYLES[e.kind].icon" class="h-3.5 w-3.5" />
          </span>

          <div class="min-w-0">
            <p class="flex flex-wrap items-center gap-x-1.5 text-xs text-harbor-black/50">
              <span class="font-bold text-harbor-black">{{ e.actorName || 'Sistema' }}</span>
              <span>{{ KIND_STYLES[e.kind].label || humanize(e.eventType) }}</span>
              <span>·</span>
              <time :datetime="e.createdAt">{{ formatDate(e.createdAt) }}</time>
            </p>

            <div v-if="e.kind === 'status'" class="mt-1 flex flex-wrap items-center gap-1.5">
              <MaintenanceStatusPill v-if="e.fromStatus" :status="e.fromStatus" />
              <ArrowRight v-if="e.fromStatus" class="h-3.5 w-3.5 text-harbor-black/40" />
              <MaintenanceStatusPill v-if="e.toStatus" :status="e.toStatus" />
            </div>
            <p
              v-else-if="e.kind !== 'note' && !e.note && !e.meta.length"
              class="mt-0.5 text-sm text-harbor-black"
            >
              {{ humanize(e.eventType) }}
            </p>

            <p
              v-if="e.note"
              class="mt-1 whitespace-pre-line rounded-lg border border-harbor-gray/60 bg-harbor-neutral-white px-2.5 py-2 text-sm text-harbor-black"
            >
              {{ e.note }}
            </p>

            <dl v-if="e.meta.length" class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-harbor-black/60">
              <div v-for="m in e.meta" :key="m.key" class="flex gap-1">
                <dt class="font-semibold">{{ m.key }}:</dt>
                <dd>{{ m.value }}</dd>
              </div>
            </dl>
          </div>
        </li>
      </ol>
    </template>
  </div>
</template>
