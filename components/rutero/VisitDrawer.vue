<script setup lang="ts">
import { computed } from 'vue'
import {
  DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from 'reka-ui'
import { CheckCircle2, Clock, X, XCircle } from 'lucide-vue-next'
import { dayLabel } from '~/types/route'
import type { ScheduleDay, ScheduledRoute, VisitStatus } from '~/types/route'
import type { Advisor } from '~/types/advisor'
import { formatShortDate, formatVisitTime, percent, routeProgress, visitStatus } from '~/lib/routeWeek'

const props = defineProps<{
  advisor: Advisor | null
  day: ScheduleDay | null
  route: ScheduledRoute | null
  today: string
}>()

const open = defineModel<boolean>('open', { default: false })

const progress = computed(() =>
  props.route && props.day ? routeProgress(props.route, props.day.date, props.today) : null
)

const items = computed(() => {
  if (!props.route || !props.day) return []
  return props.route.complexes.map(complex => ({
    complex,
    status: visitStatus(complex, props.day!.date, props.today),
  }))
})

const STATUS_META: Record<VisitStatus, { label: string, icon: any, classes: string }> = {
  visited: { label: 'Visitado', icon: CheckCircle2, classes: 'text-emerald-600' },
  pending: { label: 'Pendiente', icon: Clock, classes: 'text-harbor-black/40' },
  missed: { label: 'No visitado', icon: XCircle, classes: 'text-harbor-error' },
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-harbor-black/40 visit-fade" />
      <DialogContent
        class="visit-slide fixed inset-y-0 right-0 z-50 flex w-[460px] max-w-full flex-col bg-harbor-pure-white shadow-2xl focus:outline-none"
      >
        <template v-if="route && day">
          <div class="flex flex-col gap-3 border-b border-harbor-gray px-5 pt-4 pb-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="flex items-center gap-1.5 text-xs text-harbor-black/50">
                  <span
                    v-if="advisor"
                    class="h-2 w-2 rounded-full"
                    :style="{ backgroundColor: advisor.color }"
                  />
                  {{ advisor?.name ?? 'Asesor' }} · {{ dayLabel(day.dayOfWeek) }} {{ formatShortDate(day.date) }}
                </p>
                <DialogTitle class="mt-0.5 text-lg font-bold text-harbor-black truncate">
                  {{ route.routeName }}
                </DialogTitle>
                <DialogDescription class="text-xs text-harbor-black/50">
                  Prioridad {{ route.priority }} · {{ route.complexes.length }} conjunto{{ route.complexes.length === 1 ? '' : 's' }}
                </DialogDescription>
              </div>
              <DialogClose
                class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-harbor-black/60 hover:bg-harbor-surface-gray"
                aria-label="Cerrar panel"
              >
                <X class="h-4 w-4" />
              </DialogClose>
            </div>

            <div v-if="progress" class="flex items-center gap-3">
              <div class="h-2 flex-1 rounded-full bg-harbor-surface-gray overflow-hidden">
                <div class="h-full rounded-full bg-harbor-blue" :style="{ width: `${percent(progress)}%` }" />
              </div>
              <span class="text-sm font-semibold tabular-nums text-harbor-black">
                {{ progress.visited }}/{{ progress.total }}
                <span class="text-harbor-black/50 font-normal">({{ percent(progress) }}%)</span>
              </span>
            </div>

            <p v-if="route.notes" class="text-sm text-harbor-black/70 whitespace-pre-line">{{ route.notes }}</p>
          </div>

          <div class="flex-1 overflow-y-auto p-5">
            <h3 class="text-xs font-bold text-harbor-black/60 uppercase tracking-wide mb-3">Orden de visita</h3>
            <ol class="border border-harbor-gray rounded-lg divide-y divide-harbor-gray/60">
              <li
                v-for="(item, index) in items"
                :key="item.complex.complexId"
                class="px-4 py-2.5 flex items-center gap-3"
              >
                <span
                  class="w-6 h-6 shrink-0 rounded-full text-xs font-mono font-bold flex items-center justify-center
                         bg-harbor-blue/15 text-harbor-blue-dark"
                >
                  {{ item.complex.visitOrder ?? index + 1 }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-harbor-black truncate">{{ item.complex.name }}</p>
                  <p v-if="item.complex.address" class="text-xs text-harbor-black/45 truncate">
                    {{ item.complex.address }}
                  </p>
                </div>
                <div class="shrink-0 flex flex-col items-end" :class="STATUS_META[item.status].classes">
                  <span class="flex items-center gap-1 text-xs font-semibold">
                    <component :is="STATUS_META[item.status].icon" class="h-4 w-4" />
                    {{ STATUS_META[item.status].label }}
                  </span>
                  <span v-if="item.complex.visitedAt" class="text-[11px] text-harbor-black/50">
                    {{ formatVisitTime(item.complex.visitedAt) }}
                  </span>
                </div>
              </li>
            </ol>
            <p v-if="!items.length" class="text-sm text-harbor-black/50">Esta ruta no tiene conjuntos activos.</p>
          </div>
        </template>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.visit-fade[data-state='open'] {
  animation: visit-fade-in 0.2s ease-out;
}
.visit-slide[data-state='open'] {
  animation: visit-slide-in 0.25s ease-out;
}
@keyframes visit-fade-in {
  from { opacity: 0; }
}
@keyframes visit-slide-in {
  from { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .visit-fade[data-state='open'],
  .visit-slide[data-state='open'] {
    animation: none;
  }
}
</style>
