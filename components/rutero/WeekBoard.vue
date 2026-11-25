<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { DAYS_OF_WEEK } from '~/types/route'
import type { ScheduleDay, ScheduledRoute } from '~/types/route'
import { formatShortDate, percent, routeProgress } from '~/lib/routeWeek'
import type { Progress, WeekBoardRow } from '~/lib/routeWeek'

const props = defineProps<{
  rows: WeekBoardRow[]
  weekDates: Record<number, string>
  today: string
}>()

const emit = defineEmits<{
  select: [payload: { advisorId: string, day: ScheduleDay, route: ScheduledRoute }]
}>()

type Tone = 'done' | 'missed' | 'partial' | 'idle'

function chipTone(p: Progress): Tone {
  if (p.total && p.visited === p.total) return 'done'
  if (p.missed) return 'missed'
  if (p.visited) return 'partial'
  return 'idle'
}

/** Celdas con el avance de cada ruta ya calculado. */
const grid = computed(() =>
  props.rows.map(row => ({
    row,
    cells: DAYS_OF_WEEK.map(d => {
      const day = row.days[d.value]
      const date = day?.date || props.weekDates[d.value]
      return {
        dayOfWeek: d.value,
        date,
        day,
        chips: (day?.routes ?? []).map(route => {
          const progress = routeProgress(route, date, props.today)
          return { route, progress, tone: chipTone(progress) }
        }),
      }
    }),
  }))
)

const CHIP_CLASSES = {
  done: 'border-harbor-success/50 bg-harbor-success/10',
  missed: 'border-harbor-error/40 bg-harbor-error/5',
  partial: 'border-harbor-blue/50 bg-harbor-blue/5',
  idle: 'border-harbor-gray bg-harbor-pure-white',
}

const BAR_CLASSES = {
  done: 'bg-harbor-success',
  missed: 'bg-harbor-error/70',
  partial: 'bg-harbor-blue',
  idle: 'bg-harbor-blue',
}
</script>

<template>
  <div class="bg-harbor-pure-white border border-harbor-gray rounded-xl overflow-hidden">
    <!-- Encabezado de dias -->
    <div class="grid grid-cols-[220px_repeat(6,minmax(0,1fr))] border-b border-harbor-gray bg-harbor-neutral-white">
      <div class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-harbor-black/50">Asesor</div>
      <div
        v-for="day in DAYS_OF_WEEK"
        :key="day.value"
        class="px-3 py-3 border-l border-harbor-gray"
        :class="weekDates[day.value] === today ? 'bg-harbor-blue/10' : ''"
      >
        <p
          class="text-xs font-bold uppercase tracking-wide"
          :class="weekDates[day.value] === today ? 'text-harbor-blue-dark' : 'text-harbor-black/50'"
        >
          {{ day.label }}
          <span v-if="weekDates[day.value] === today" class="normal-case font-semibold">· hoy</span>
        </p>
        <p class="text-xs text-harbor-black/40 mt-0.5">{{ formatShortDate(weekDates[day.value]) }}</p>
      </div>
    </div>

    <!-- Filas por asesor -->
    <div
      v-for="{ row, cells } in grid"
      :key="row.advisor.id"
      class="grid grid-cols-[220px_repeat(6,minmax(0,1fr))] border-b border-harbor-gray/70 last:border-b-0"
    >
      <div class="px-4 py-3 flex flex-col justify-center gap-1.5 min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <span class="h-2.5 w-2.5 rounded-full shrink-0" :style="{ backgroundColor: row.advisor.color }" />
          <span class="text-sm font-semibold text-harbor-black truncate">{{ row.advisor.name }}</span>
        </div>
        <p v-if="row.failed" class="flex items-center gap-1 text-xs text-harbor-error">
          <AlertTriangle class="h-3.5 w-3.5" />
          No se pudo cargar
        </p>
        <div v-else-if="row.progress.total" class="flex items-center gap-2">
          <div class="h-1.5 flex-1 rounded-full bg-harbor-surface-gray overflow-hidden">
            <div class="h-full rounded-full bg-harbor-blue" :style="{ width: `${percent(row.progress)}%` }" />
          </div>
          <span class="text-xs font-mono tabular-nums text-harbor-black/60">
            {{ row.progress.visited }}/{{ row.progress.total }}
          </span>
        </div>
        <p v-else class="text-xs text-harbor-black/40">Sin rutas esta semana</p>
      </div>

      <div
        v-for="cell in cells"
        :key="cell.dayOfWeek"
        class="px-2 py-2 border-l border-harbor-gray/70 flex flex-col gap-1.5 min-w-0"
        :class="cell.date === today ? 'bg-harbor-blue/5' : cell.date < today ? 'bg-harbor-neutral-white' : ''"
      >
        <button
          v-for="chip in cell.chips"
          :key="chip.route.assignmentId"
          type="button"
          class="w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors hover:border-harbor-blue-dark
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-harbor-blue"
          :class="CHIP_CLASSES[chip.tone]"
          :title="`${chip.route.routeName} · ver conjuntos`"
          @click="emit('select', { advisorId: row.advisor.id, day: cell.day!, route: chip.route })"
        >
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-xs font-semibold text-harbor-black truncate">{{ chip.route.routeName }}</span>
            <span class="text-[11px] font-mono tabular-nums text-harbor-black/60 shrink-0">
              {{ chip.progress.visited }}/{{ chip.progress.total }}
            </span>
          </div>
          <div class="mt-1 h-1 rounded-full bg-harbor-surface-gray overflow-hidden">
            <div
              class="h-full rounded-full"
              :class="BAR_CLASSES[chip.tone]"
              :style="{ width: `${percent(chip.progress)}%` }"
            />
          </div>
          <p v-if="chip.progress.missed" class="mt-0.5 text-[11px] font-semibold text-harbor-error">
            {{ chip.progress.missed }} sin visitar
          </p>
        </button>
        <span v-if="!cell.chips.length" class="m-auto text-xs text-harbor-black/20">—</span>
      </div>
    </div>

    <p v-if="!rows.length" class="px-4 py-10 text-center text-sm text-harbor-black/50">
      Ningun asesor tiene rutas asignadas esta semana.
    </p>
  </div>
</template>
