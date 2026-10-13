<script setup lang="ts">
import { statusLabel } from '~/types/maintenance'

defineProps<{ status: string }>()

const STATUS_CLASSES: Record<string, string> = {
  recibida: 'bg-harbor-info/10 text-harbor-info',
  en_revision: 'bg-harbor-purple/10 text-harbor-purple',
  esperando_aprobacion: 'bg-harbor-warning/15 text-amber-700',
  programada: 'bg-harbor-blue/15 text-harbor-blue-dark',
  en_ejecucion: 'bg-harbor-blue/15 text-harbor-blue-dark ring-1 ring-inset ring-harbor-blue',
  resuelta: 'bg-harbor-success/15 text-emerald-700',
  cerrada: 'bg-harbor-surface-gray text-harbor-black/60',
  cancelada: 'bg-harbor-surface-gray text-harbor-black/40 line-through',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
    :class="STATUS_CLASSES[status] ?? 'bg-harbor-surface-gray text-harbor-black/60'"
  >
    {{ statusLabel(status) }}<slot />
  </span>
</template>
