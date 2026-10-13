<script setup lang="ts">
import { priorityLabel } from '~/types/maintenance'

defineProps<{ priority: string }>()

const PRIORITY_CLASSES: Record<string, string> = {
  urgente: 'bg-harbor-error text-white',
  alta: 'bg-harbor-error/10 text-harbor-error',
  media: 'bg-harbor-warning/15 text-amber-700',
  baja: 'bg-harbor-surface-gray text-harbor-black/60',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
    :class="PRIORITY_CLASSES[priority] ?? 'bg-harbor-surface-gray text-harbor-black/60'"
  >
    {{ priorityLabel(priority) }}
  </span>
</template>
