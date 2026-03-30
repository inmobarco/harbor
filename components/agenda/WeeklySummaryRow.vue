<script setup lang="ts">
import type { Advisor } from '~/types/advisor'

defineProps<{
  label: string
  dateRange: string
  advisorSummaries: Array<{
    advisor: Advisor
    pendingCount: number
    confirmedCount: number
  }>
}>()
</script>

<template>
  <div>
    <div class="flex items-baseline gap-2 mb-3">
      <h3 class="text-sm font-bold text-harbor-black">{{ label }}</h3>
      <span class="text-xs text-harbor-black/40">({{ dateRange }})</span>
    </div>
    <div class="flex gap-3 overflow-x-auto pb-2">
      <div
        v-for="{ advisor, pendingCount, confirmedCount } in advisorSummaries"
        :key="advisor.id"
        class="bg-white rounded-lg border border-harbor-gray p-3 min-w-[170px] shrink-0"
      >
        <div class="flex items-center gap-2 mb-2">
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ backgroundColor: advisor.color }"
          />
          <span class="text-sm font-semibold text-harbor-black truncate">{{ advisor.name }}</span>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <span class="text-amber-600">{{ pendingCount }} pendiente{{ pendingCount !== 1 ? 's' : '' }}</span>
          <span class="text-emerald-600">{{ confirmedCount }} confirmada{{ confirmedCount !== 1 ? 's' : '' }}</span>
        </div>
      </div>
      <div
        v-if="advisorSummaries.length === 0"
        class="text-sm text-harbor-black/40 py-2"
      >
        No hay asesores visibles
      </div>
    </div>
  </div>
</template>
