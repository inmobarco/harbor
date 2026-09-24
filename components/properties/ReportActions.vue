<script setup lang="ts">
import { FileSpreadsheet, FileText, Contact } from 'lucide-vue-next'
import type { ReportKind } from '~/composables/usePropertyReport'

const { loading, running, progress, error, downloadReport } = usePropertyReport()

/** El estado (progreso o error) se muestra solo en el boton que se pulso. */
function labelFor(kind: ReportKind, base: string): string {
  if (running.value !== kind) return base
  if (loading.value) {
    return progress.value.total
      ? `Generando... ${progress.value.loaded}/${progress.value.total}`
      : 'Generando...'
  }
  if (error.value) return 'Error, reintentar'
  return base
}

const isFailed = (kind: ReportKind) => running.value === kind && !loading.value && error.value
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      @click="downloadReport('general')"
      :disabled="loading"
      title="Excel con todas las propiedades activas, agrupadas por municipio"
      class="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors border disabled:opacity-60 disabled:cursor-wait"
      :class="isFailed('general')
        ? 'text-harbor-warning border-harbor-warning/40 hover:bg-harbor-warning hover:text-white'
        : 'text-harbor-blue-dark border-harbor-blue/30 hover:bg-harbor-blue-dark hover:text-white hover:border-harbor-blue'"
    >
      <FileSpreadsheet class="w-4 h-4" />
      {{ labelFor('general', 'Descargar informe general') }}
    </button>

    <button
      @click="downloadReport('detailed')"
      :disabled="loading"
      title="Excel por municipio, del que mas propiedades tiene al que menos"
      class="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors border disabled:opacity-60 disabled:cursor-wait"
      :class="isFailed('detailed')
        ? 'text-harbor-warning border-harbor-warning/40 hover:bg-harbor-warning hover:text-white'
        : 'text-harbor-blue-dark border-harbor-blue/30 hover:bg-harbor-blue-dark hover:text-white hover:border-harbor-blue'"
    >
      <FileText class="w-4 h-4" />
      {{ labelFor('detailed', 'Descargar informe detallado') }}
    </button>

    <button
      @click="downloadReport('contacts')"
      :disabled="loading"
      title="Excel con el nombre y celular del propietario de cada propiedad activa"
      class="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors border disabled:opacity-60 disabled:cursor-wait"
      :class="isFailed('contacts')
        ? 'text-harbor-warning border-harbor-warning/40 hover:bg-harbor-warning hover:text-white'
        : 'text-harbor-blue-dark border-harbor-blue/30 hover:bg-harbor-blue-dark hover:text-white hover:border-harbor-blue'"
    >
      <Contact class="w-4 h-4" />
      {{ labelFor('contacts', 'Descargar contactos de propietarios') }}
    </button>
  </div>
</template>
