<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'

const {
  canView,
  loading,
  error,
  hasData,
  currentWeek,
  previousWeek,
  currentTotal,
  previousTotal,
  previousToDate,
  currentByType,
  previousByType,
  rows,
  activeAdvisors,
  fetchAcquisitions,
  ensureLoaded,
} = useAcquisitions()

const expanded = ref<Set<string>>(new Set())

function rowKey(row: { advisor: { id: number | null; name: string } }): string {
  return row.advisor.id === null ? `name:${row.advisor.name}` : `id:${row.advisor.id}`
}

function toggle(key: string) {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

const maxCount = computed(() =>
  rows.value.reduce((m, r) => Math.max(m, r.current.length, r.previous.length), 0),
)

/** Ritmo frente a la semana pasada al mismo dia */
const pace = computed(() => currentTotal.value - previousToDate.value)

onMounted(() => {
  if (canView.value) ensureLoaded()
})
</script>

<template>
  <section v-if="canView" class="space-y-4">
    <!-- KPIs -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border border-harbor-gray p-5">
        <p class="text-xs font-semibold text-harbor-black/50 uppercase tracking-wider">
          Semana actual <span class="normal-case font-medium text-harbor-black/40">· {{ currentWeek.label }}</span>
        </p>
        <div class="flex items-baseline gap-3 mt-2">
          <span class="text-4xl font-bold text-harbor-black tabular-nums">{{ hasData ? currentTotal : '—' }}</span>
          <span v-if="hasData" class="text-sm text-harbor-black/50">captaciones</span>
        </div>
        <p v-if="hasData" class="text-xs mt-2" :class="pace > 0 ? 'text-emerald-600' : 'text-harbor-black/50'">
          {{ pace > 0 ? `+${pace}` : pace === 0 ? 'Igual' : `−${Math.abs(pace)}` }}
          vs. la semana pasada a esta altura ({{ previousToDate }})
        </p>
        <div v-if="currentByType.length" class="flex flex-wrap gap-1.5 mt-3">
          <span
            v-for="t in currentByType"
            :key="t.label"
            class="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-harbor-blue/10 text-harbor-blue-dark"
          >
            {{ t.label }} {{ t.count }}
          </span>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-harbor-gray p-5">
        <p class="text-xs font-semibold text-harbor-black/50 uppercase tracking-wider">
          Semana pasada <span class="normal-case font-medium text-harbor-black/40">· {{ previousWeek.label }}</span>
        </p>
        <div class="flex items-baseline gap-3 mt-2">
          <span class="text-4xl font-bold text-harbor-black/70 tabular-nums">{{ hasData ? previousTotal : '—' }}</span>
          <span v-if="hasData" class="text-sm text-harbor-black/50">captaciones</span>
        </div>
        <div v-if="previousByType.length" class="flex flex-wrap gap-1.5 mt-3">
          <span
            v-for="t in previousByType"
            :key="t.label"
            class="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-harbor-surface-gray text-harbor-black/60"
          >
            {{ t.label }} {{ t.count }}
          </span>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-harbor-gray p-5">
        <p class="text-xs font-semibold text-harbor-black/50 uppercase tracking-wider">
          Asesores captando esta semana
        </p>
        <div class="flex items-baseline gap-2 mt-2">
          <span class="text-4xl font-bold text-harbor-black tabular-nums">{{ hasData ? activeAdvisors : '—' }}</span>
          <span v-if="hasData" class="text-sm text-harbor-black/50">de {{ rows.length }}</span>
        </div>
        <p v-if="hasData && rows.length - activeAdvisors > 0" class="text-xs text-amber-600 mt-2">
          {{ rows.length - activeAdvisors }} sin captaciones esta semana
        </p>
      </div>
    </div>

    <!-- Tabla por asesor -->
    <div class="bg-white rounded-xl border border-harbor-gray">
      <div class="flex items-center gap-3 px-4 pt-4 pb-3">
        <h2 class="text-sm font-semibold text-harbor-black/60 uppercase tracking-wider">
          Captaciones por asesor
        </h2>
        <button
          type="button"
          class="ml-auto p-1.5 rounded-md text-harbor-black/40 hover:text-harbor-black hover:bg-harbor-surface-gray transition-colors disabled:opacity-40"
          :disabled="loading"
          title="Actualizar"
          @click="fetchAcquisitions()"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>

      <!-- Encabezados -->
      <div
        class="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_5rem_1.5rem] gap-4 px-4 py-2 border-y border-harbor-gray bg-harbor-neutral-white text-[11px] font-semibold text-harbor-black/45 uppercase tracking-wider"
      >
        <span>Asesor</span>
        <span>Semana actual</span>
        <span>Semana pasada</span>
        <span class="text-right">Diferencia</span>
        <span />
      </div>

      <!-- Carga inicial -->
      <div v-if="loading && !hasData" class="divide-y divide-harbor-gray">
        <div v-for="i in 5" :key="i" class="h-12 px-4 flex items-center">
          <div class="h-3 w-full rounded bg-harbor-surface-gray animate-pulse" />
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="m-4 flex items-center gap-3 text-sm text-harbor-error bg-harbor-error/5 border border-harbor-error/20 rounded-lg px-4 py-3"
      >
        <span class="flex-1">{{ error }}</span>
        <button type="button" class="text-xs font-semibold underline shrink-0" @click="fetchAcquisitions()">
          Reintentar
        </button>
      </div>

      <p v-else-if="!rows.length" class="px-4 py-6 text-sm text-harbor-black/40">
        No hay captaciones en las dos ultimas semanas
      </p>

      <div v-else>
        <DashboardAcquisitionsAdvisorRow
          v-for="row in rows"
          :key="rowKey(row)"
          :row="row"
          :max="maxCount"
          :expanded="expanded.has(rowKey(row))"
          @toggle="toggle(rowKey(row))"
        />
      </div>
    </div>
  </section>

  <div v-else class="bg-white rounded-xl border border-harbor-gray p-6 text-sm text-harbor-black/50">
    Bienvenido a Harbor. Usa el menu lateral para ir a la seccion que necesites.
  </div>
</template>
