<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { Acquisition, AdvisorAcquisitionsRow } from '~/types/acquisition'
import { formatCop, formatShortDate } from '~/lib/acquisitions'

const props = defineProps<{
  row: AdvisorAcquisitionsRow
  /** Mayor conteo semanal entre todos los asesores, para escalar las barras */
  max: number
  expanded: boolean
}>()

defineEmits<{ toggle: [] }>()

const diff = computed(() => props.row.current.length - props.row.previous.length)
const hasAny = computed(() => props.row.current.length + props.row.previous.length > 0)

function barWidth(count: number): string {
  if (!props.max || !count) return '0%'
  return `${Math.max((count / props.max) * 100, 4)}%`
}

function place(a: Acquisition): string {
  const unit = [a.unitName, a.apartmentNumber ? `Apto ${a.apartmentNumber}` : null]
    .filter(Boolean)
    .join(' · ')
  return [unit || 'Sin unidad', a.city].filter(Boolean).join(' — ')
}

function prices(a: Acquisition): string[] {
  const out: string[] = []
  if (a.rentPrice) out.push(`Arriendo ${formatCop(a.rentPrice)}`)
  if (a.salePrice) out.push(`Venta ${formatCop(a.salePrice)}`)
  return out
}

const sections = computed(() => [
  { key: 'current', label: 'Esta semana', items: props.row.current },
  { key: 'previous', label: 'Semana pasada', items: props.row.previous },
])
</script>

<template>
  <div class="border-t border-harbor-gray first:border-t-0">
    <button
      type="button"
      class="w-full grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_5rem_1.5rem] items-center gap-4 px-4 py-3 text-left transition-colors"
      :class="hasAny ? 'hover:bg-harbor-neutral-white cursor-pointer' : 'cursor-default'"
      :disabled="!hasAny"
      @click="$emit('toggle')"
    >
      <!-- Asesor -->
      <span class="flex items-center gap-2 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: row.advisor.color }" />
        <span class="text-sm font-semibold text-harbor-black truncate">{{ row.advisor.name }}</span>
      </span>

      <!-- Semana actual -->
      <span class="flex items-center gap-3">
        <span
          class="w-7 text-right text-lg font-bold tabular-nums"
          :class="row.current.length ? 'text-harbor-black' : 'text-harbor-black/25'"
        >
          {{ row.current.length }}
        </span>
        <span class="flex-1 h-2 rounded-full bg-harbor-surface-gray overflow-hidden">
          <span class="block h-full rounded-full bg-harbor-blue" :style="{ width: barWidth(row.current.length) }" />
        </span>
      </span>

      <!-- Semana pasada -->
      <span class="flex items-center gap-3">
        <span
          class="w-7 text-right text-lg font-semibold tabular-nums"
          :class="row.previous.length ? 'text-harbor-black/60' : 'text-harbor-black/25'"
        >
          {{ row.previous.length }}
        </span>
        <span class="flex-1 h-2 rounded-full bg-harbor-surface-gray overflow-hidden">
          <span class="block h-full rounded-full bg-harbor-black/30" :style="{ width: barWidth(row.previous.length) }" />
        </span>
      </span>

      <!-- Variacion -->
      <span
        class="text-sm font-semibold tabular-nums text-right"
        :class="diff > 0 ? 'text-emerald-600' : 'text-harbor-black/40'"
      >
        {{ diff > 0 ? `+${diff}` : diff === 0 ? '=' : `−${Math.abs(diff)}` }}
      </span>

      <ChevronRight
        v-if="hasAny"
        class="w-4 h-4 text-harbor-black/40 transition-transform"
        :class="{ 'rotate-90': expanded }"
      />
      <span v-else />
    </button>

    <!-- Detalle -->
    <div v-if="expanded" class="grid grid-cols-2 gap-6 px-4 pb-4 pt-1 bg-harbor-neutral-white/60">
      <div v-for="section in sections" :key="section.key">
        <p class="text-[11px] font-semibold text-harbor-black/40 uppercase tracking-wider mb-2">
          {{ section.label }} · {{ section.items.length }}
        </p>
        <p v-if="!section.items.length" class="text-xs text-harbor-black/40">Sin captaciones</p>
        <ul v-else class="space-y-2">
          <li
            v-for="a in section.items"
            :key="a.id"
            class="flex items-start gap-3 bg-white rounded-lg border border-harbor-gray px-3 py-2"
          >
            <span class="text-xs font-semibold text-harbor-black/50 w-12 shrink-0 pt-0.5">
              {{ formatShortDate(a.date) }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-harbor-black truncate leading-tight">{{ place(a) }}</p>
              <p class="text-[11px] text-harbor-black/50 flex flex-wrap gap-x-2 mt-0.5">
                <span v-if="a.wasiCode" class="font-mono">#{{ a.wasiCode }}</span>
                <span v-for="p in prices(a)" :key="p">{{ p }}</span>
              </p>
            </div>
            <span
              v-if="a.businessType"
              class="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-harbor-blue/10 text-harbor-blue-dark shrink-0"
            >
              {{ a.businessType }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
