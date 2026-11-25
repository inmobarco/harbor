<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useNow } from '@vueuse/core'
import { RefreshCw, Settings2 } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'
import type { ScheduleDay, ScheduledRoute } from '~/types/route'
import type { WeekBoardRow } from '~/lib/routeWeek'
import {
  colombiaDate, currentWeekDates, dayProgress, formatShortDate, percent, sumProgress, weekProgress,
} from '~/lib/routeWeek'

definePageMeta({ layout: 'default' })

const {
  weeks, failedAdvisorIds, weekLoadedAt, advisors, advisorsLoading,
  assignmentsLoading, assignmentsError, fetchAssignments, getAdvisorById,
} = useRoutes()

// "Hoy" en Colombia se recalcula cada minuto: a medianoche las visitas
// pendientes de ayer pasan a "no visitado" sin recargar
const nowDate = useNow({ interval: 60_000 })
const today = computed(() => colombiaDate(nowDate.value))
const weekDates = computed(() => currentWeekDates(nowDate.value))

const onlyWithRoutes = ref(true)

onMounted(fetchAssignments)

const allRows = computed<WeekBoardRow[]>(() =>
  advisors.value.map(advisor => {
    const days = weeks.value[advisor.id] ?? []
    const byDay: Record<number, ScheduleDay | undefined> = {}
    for (const day of days) byDay[day.dayOfWeek] = day
    return {
      advisor,
      days: byDay,
      progress: weekProgress(days, today.value),
      failed: failedAdvisorIds.value.includes(advisor.id),
    }
  })
)

const rows = computed(() =>
  onlyWithRoutes.value
    ? allRows.value.filter(r => r.progress.total > 0 || r.failed)
    : allRows.value
)

const hiddenCount = computed(() => allRows.value.length - rows.value.length)

const weekTotals = computed(() => sumProgress(allRows.value.map(r => r.progress)))

const todayTotals = computed(() =>
  sumProgress(
    Object.values(weeks.value)
      .flatMap(days => days.filter(d => d.date === today.value))
      .map(d => dayProgress(d, today.value))
  )
)

const advisorsToday = computed(() =>
  Object.values(weeks.value).filter(days =>
    days.some(d => d.date === today.value && d.routes.length)
  ).length
)

const weekRange = computed(() => `${formatShortDate(weekDates.value[1])} – ${formatShortDate(weekDates.value[6])}`)

const loadedAtLabel = computed(() =>
  weekLoadedAt.value
    ? weekLoadedAt.value.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' })
    : null
)

const loading = computed(() => assignmentsLoading.value || advisorsLoading.value)
const firstLoad = computed(() => loading.value && !weekLoadedAt.value)

// Panel de detalle de una ruta
const drawerOpen = ref(false)
const selection = ref<{ advisorId: string, day: ScheduleDay, route: ScheduledRoute } | null>(null)

function openRoute(payload: { advisorId: string, day: ScheduleDay, route: ScheduledRoute }) {
  selection.value = payload
  drawerOpen.value = true
}

const selectedAdvisor = computed(() =>
  selection.value ? getAdvisorById(selection.value.advisorId) ?? null : null
)
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-harbor-black">Rutero</h1>
        <p class="text-sm text-harbor-black/50 mt-0.5">
          Semana del {{ weekRange }}
          <template v-if="loadedAtLabel"> · Actualizado {{ loadedAtLabel }}</template>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" :disabled="loading" @click="fetchAssignments">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Actualizar
        </Button>
        <Button as-child size="sm">
          <NuxtLink to="/rutero/gestionar">
            <Settings2 class="h-4 w-4" />
            Gestionar rutas
          </NuxtLink>
        </Button>
      </div>
    </div>

    <!-- Indicadores -->
    <div class="grid grid-cols-4 gap-3">
      <div class="rounded-xl border border-harbor-gray bg-harbor-pure-white px-4 py-3">
        <p class="text-2xl font-bold tabular-nums text-harbor-black leading-tight">
          {{ percent(weekTotals) }}%
        </p>
        <p class="text-xs font-semibold text-harbor-black/60">
          Avance semana · {{ weekTotals.visited }}/{{ weekTotals.total }} conjuntos
        </p>
      </div>
      <div class="rounded-xl border border-harbor-gray bg-harbor-pure-white px-4 py-3">
        <p class="text-2xl font-bold tabular-nums text-harbor-black leading-tight">
          {{ todayTotals.visited }}/{{ todayTotals.total }}
        </p>
        <p class="text-xs font-semibold text-harbor-black/60">Visitados hoy</p>
      </div>
      <div class="rounded-xl border border-harbor-gray bg-harbor-pure-white px-4 py-3">
        <p class="text-2xl font-bold tabular-nums text-harbor-black leading-tight">{{ advisorsToday }}</p>
        <p class="text-xs font-semibold text-harbor-black/60">Asesores en ruta hoy</p>
      </div>
      <div class="rounded-xl border border-harbor-gray bg-harbor-pure-white px-4 py-3">
        <p
          class="text-2xl font-bold tabular-nums leading-tight"
          :class="weekTotals.missed ? 'text-harbor-error' : 'text-harbor-black'"
        >
          {{ weekTotals.missed }}
        </p>
        <p class="text-xs font-semibold text-harbor-black/60">No visitados (dias pasados)</p>
      </div>
    </div>

    <p v-if="assignmentsError" class="text-sm text-harbor-warning">{{ assignmentsError }}</p>

    <!-- Filtro -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Checkbox id="only-with-routes" v-model="onlyWithRoutes" />
        <Label for="only-with-routes" class="text-sm text-harbor-black/70 cursor-pointer">
          Solo asesores con rutas
        </Label>
        <span v-if="onlyWithRoutes && hiddenCount" class="text-xs text-harbor-black/40">
          ({{ hiddenCount }} oculto{{ hiddenCount === 1 ? '' : 's' }})
        </span>
      </div>
      <div class="flex items-center gap-4 text-xs text-harbor-black/50">
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-harbor-success" /> Completa</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-harbor-blue" /> En curso / pendiente</span>
        <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-harbor-error/70" /> Con conjuntos sin visitar</span>
      </div>
    </div>

    <!-- Tablero -->
    <div
      v-if="firstLoad"
      class="rounded-xl border border-harbor-gray bg-harbor-pure-white px-4 py-16 text-center text-sm text-harbor-black/50"
    >
      Cargando rutas de la semana...
    </div>
    <RuteroWeekBoard
      v-else
      :rows="rows"
      :week-dates="weekDates"
      :today="today"
      @select="openRoute"
    />

    <RuteroVisitDrawer
      v-model:open="drawerOpen"
      :advisor="selectedAdvisor"
      :day="selection?.day ?? null"
      :route="selection?.route ?? null"
      :today="today"
    />
  </div>
</template>
