<script setup lang="ts">
const { weeklySummary } = useAgenda()
</script>

<template>
  <div class="bg-white rounded-xl border border-harbor-gray p-6 space-y-6">
    <h2 class="text-sm font-semibold text-harbor-black/60 uppercase tracking-wider">
      Resumen semanal
    </h2>
    <AgendaWeeklySummaryRow
      v-for="(week, index) in weeklySummary"
      :key="index"
      :label="week.label"
      :date-range="week.dateRange"
      :advisor-summaries="week.advisorSummaries"
    />
  </div>
</template>
