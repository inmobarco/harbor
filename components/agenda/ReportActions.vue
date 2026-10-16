<script setup lang="ts">
import { FileSpreadsheet } from 'lucide-vue-next'
import type { AppointmentReportPeriod } from '~/composables/useAppointmentReport'
import { monthLabel } from '~/composables/useAppointmentReport'

const { loading, running, error, downloadReport } = useAppointmentReport()

const periods: AppointmentReportPeriod[] = ['previous', 'current']

/** El estado (progreso o error) se muestra solo en el boton que se pulso. */
function labelFor(period: AppointmentReportPeriod): string {
  if (running.value === period) {
    if (loading.value) return 'Generando...'
    if (error.value) return 'Error, reintentar'
  }
  return `Informe ${monthLabel(period)}`
}

const isFailed = (period: AppointmentReportPeriod) => running.value === period && !loading.value && error.value
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      v-for="period in periods"
      :key="period"
      @click="downloadReport(period)"
      :disabled="loading"
      :title="`Excel con todas las citas de ${monthLabel(period)}, agrupadas por asesor`"
      class="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors border disabled:opacity-60 disabled:cursor-wait"
      :class="isFailed(period)
        ? 'text-harbor-warning border-harbor-warning/40 hover:bg-harbor-warning hover:text-white'
        : 'text-harbor-blue-dark border-harbor-blue/30 hover:bg-harbor-blue-dark hover:text-white hover:border-harbor-blue'"
    >
      <FileSpreadsheet class="w-4 h-4" />
      {{ labelFor(period) }}
    </button>
  </div>
</template>
