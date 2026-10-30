<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Clock, Flame, Layers, Paperclip } from 'lucide-vue-next'
import {
  ageHours, formatAge, formatRemaining, locationLabel, remainingHours, slaHours, slaState,
} from '~/lib/maintenanceView'
import type { MaintenanceRequest } from '~/types/maintenance'

const props = defineProps<{
  request: MaintenanceRequest
  now: number
  selected?: boolean
  /** La columna agrupa varios estados: mostrar cual es el de esta tarjeta. */
  showStatus?: boolean
  dragging?: boolean
}>()

const emit = defineEmits<{ select: []; dragstart: [event: DragEvent]; dragend: [] }>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('select')
  }
}

const { openSubmissionCounts } = useMaintenance()

/** Otras solicitudes abiertas del mismo envio (la lista completa esta en el panel). */
const siblingsOpen = computed(() => {
  const id = props.request.submissionId
  return id ? Math.max(0, (openSubmissionCounts.value.get(id) ?? 1) - 1) : 0
})

const sla = computed(() => slaState(props.request, props.now))
const age = computed(() => formatAge(ageHours(props.request, props.now)))
/** El tablero se ordena por vencimiento: mostrarlo hace legible ese orden. */
const remaining = computed(() => {
  const h = remainingHours(props.request, props.now)
  return h === null ? null : formatRemaining(h)
})
const location = computed(() => locationLabel(props.request))

const AGE_CLASSES = {
  ok: 'text-harbor-black/50',
  warn: 'text-amber-700',
  late: 'text-harbor-error',
}
</script>

<template>
  <!-- div y no button: Firefox no arrastra bien los <button draggable> -->
  <div
    role="button"
    tabindex="0"
    draggable="true"
    :aria-label="`${request.ticket} ${request.categoryLabel}`"
    class="w-full cursor-grab text-left flex flex-col gap-1.5 rounded-lg border bg-harbor-pure-white px-3 py-2.5 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-harbor-blue"
    :class="[
      selected ? 'border-harbor-blue ring-2 ring-harbor-blue/20' : 'border-harbor-gray hover:border-harbor-blue',
      dragging ? 'opacity-40' : '',
    ]"
    @click="emit('select')"
    @keydown="onKeydown"
    @dragstart="emit('dragstart', $event)"
    @dragend="emit('dragend')"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="font-mono text-[11px] font-semibold text-harbor-black/50">{{ request.ticket }}</span>
      <MaintenancePriorityPill :priority="request.priority" />
    </div>

    <p class="text-sm font-bold leading-snug text-harbor-black">
      {{ request.categoryLabel }}<span v-if="request.subcategoryLabel" class="font-medium text-harbor-black/60"> · {{ request.subcategoryLabel }}</span>
    </p>
    <p v-if="location || request.city" class="text-xs text-harbor-black/60">
      {{ location }}<span v-if="request.city" class="text-harbor-black/40">{{ location ? ' · ' : '' }}{{ request.city }}</span>
    </p>

    <div
      v-if="showStatus || request.isHappeningNow || request.needsReview || request.attachmentCount || siblingsOpen"
      class="flex flex-wrap items-center gap-2"
    >
      <MaintenanceStatusPill v-if="showStatus" :status="request.status" />
      <span
        v-if="siblingsOpen"
        class="inline-flex items-center gap-1 text-[11px] font-bold text-harbor-blue-dark"
        :title="`Reportada junto con ${siblingsOpen} solicitud(es) mas que siguen abiertas`"
      >
        <Layers class="h-3.5 w-3.5" /> +{{ siblingsOpen }} mismo envio
      </span>
      <span v-if="request.isHappeningNow" class="inline-flex items-center gap-1 text-[11px] font-bold text-harbor-error">
        <Flame class="h-3.5 w-3.5" /> Ocurre ahora
      </span>
      <span
        v-if="request.needsReview"
        class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700"
        :title="request.reviewReason ?? undefined"
      >
        <AlertTriangle class="h-3.5 w-3.5" /> Revisar
      </span>
      <span v-if="request.attachmentCount" class="inline-flex items-center gap-1 text-[11px] font-bold text-harbor-black/50">
        <Paperclip class="h-3.5 w-3.5" /> {{ request.attachmentCount }}
      </span>
    </div>

    <div class="flex items-center justify-between border-t border-harbor-gray/60 pt-1.5 mt-0.5">
      <span
        class="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums"
        :class="sla ? AGE_CLASSES[sla] : 'text-harbor-black/50'"
        :title="slaHours(request) ? `Tiempo de respuesta esperado: ${slaHours(request)} h` : undefined"
      >
        <Clock class="h-3.5 w-3.5" />
        {{ age }}<template v-if="remaining"> · {{ remaining }}</template>
      </span>
      <MaintenanceAssigneeAvatar :user-id="request.assignedUserId" :name="request.assignedUserName" />
    </div>
  </div>
</template>
