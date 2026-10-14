<script setup lang="ts">
import { computed } from 'vue'
import { QUICK_FILTERS } from '~/lib/maintenanceView'
import type { MaintenanceRequest, QuickFilterKey } from '~/types/maintenance'

const props = defineProps<{
  /** Abiertas dentro del filtro de responsable; la busqueda y demas filtros no las afectan. */
  requests: MaintenanceRequest[]
  now: number
  active: QuickFilterKey | null
}>()

const emit = defineEmits<{ toggle: [key: QuickFilterKey] }>()

const TONE_CLASSES = {
  neutral: 'text-harbor-black',
  warn: 'text-amber-700',
  crit: 'text-harbor-error',
}

const stats = computed(() =>
  QUICK_FILTERS.map(q => ({
    ...q,
    count: props.requests.filter(r => q.test(r, props.now)).length,
  }))
)
</script>

<template>
  <div class="grid grid-cols-5 gap-3">
    <button
      v-for="s in stats"
      :key="s.key"
      type="button"
      class="flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors"
      :class="active === s.key
        ? 'border-harbor-blue bg-harbor-blue/10'
        : 'border-harbor-gray bg-harbor-pure-white hover:border-harbor-blue'"
      :aria-pressed="active === s.key"
      @click="emit('toggle', s.key)"
    >
      <span
        class="text-2xl font-bold tabular-nums leading-tight"
        :class="s.count ? TONE_CLASSES[s.tone] : 'text-harbor-black'"
      >
        {{ s.count }}
      </span>
      <span class="text-xs font-semibold text-harbor-black/60">{{ s.label }}</span>
    </button>
  </div>
</template>
