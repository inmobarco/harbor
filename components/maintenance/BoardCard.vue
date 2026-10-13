<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Clock, Flame, Paperclip } from 'lucide-vue-next'
import { ageHours, formatAge, locationLabel, slaHours, slaState } from '~/lib/maintenanceView'
import type { MaintenanceRequest } from '~/types/maintenance'

const props = defineProps<{
  request: MaintenanceRequest
  now: number
  selected?: boolean
  /** La columna agrupa varios estados: mostrar cual es el de esta tarjeta. */
  showStatus?: boolean
}>()

const emit = defineEmits<{ select: [] }>()

const sla = computed(() => slaState(props.request, props.now))
const age = computed(() => formatAge(ageHours(props.request, props.now)))
const location = computed(() => locationLabel(props.request))

const AGE_CLASSES = {
  ok: 'text-harbor-black/50',
  warn: 'text-amber-700',
  late: 'text-harbor-error',
}
</script>

<template>
  <button
    type="button"
    class="w-full text-left flex flex-col gap-1.5 rounded-lg border bg-harbor-pure-white px-3 py-2.5 shadow-sm transition-colors"
    :class="selected
      ? 'border-harbor-blue ring-2 ring-harbor-blue/20'
      : 'border-harbor-gray hover:border-harbor-blue'"
    @click="emit('select')"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="font-mono text-[11px] font-semibold text-harbor-black/50">{{ request.ticket }}</span>
      <MaintenancePriorityPill :priority="request.priority" />
    </div>

    <p class="text-sm font-bold leading-snug text-harbor-black">
      {{ request.categoryLabel }}<span v-if="request.subcategoryLabel" class="font-medium text-harbor-black/60"> · {{ request.subcategoryLabel }}</span>
    </p>
    <p v-if="location" class="text-xs text-harbor-black/60">{{ location }}</p>

    <div
      v-if="showStatus || request.isHappeningNow || request.needsReview || request.attachmentCount"
      class="flex flex-wrap items-center gap-2"
    >
      <MaintenanceStatusPill v-if="showStatus" :status="request.status" />
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
        {{ age }}<template v-if="sla === 'late'"> · vencida</template>
      </span>
      <MaintenanceAssigneeAvatar :user-id="request.assignedUserId" :name="request.assignedUserName" />
    </div>
  </button>
</template>
