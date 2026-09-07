<script setup lang="ts">
import { FileSpreadsheet, FileText } from 'lucide-vue-next'

const { loading, progress, error, downloadGeneralReport } = usePropertyReport()

const generalLabel = computed(() => {
  if (loading.value) {
    return progress.value.total
      ? `Generando... ${progress.value.loaded}/${progress.value.total}`
      : 'Generando...'
  }
  if (error.value) return 'Error, reintentar'
  return 'Descargar informe general'
})
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      @click="downloadGeneralReport('xlsx')"
      :disabled="loading"
      title="Excel con todas las propiedades activas, agrupadas por municipio"
      class="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors border disabled:opacity-60 disabled:cursor-wait"
      :class="error
        ? 'text-harbor-warning border-harbor-warning/40 hover:bg-harbor-warning hover:text-white'
        : 'text-harbor-blue-dark border-harbor-blue/30 hover:bg-harbor-blue-dark hover:text-white hover:border-harbor-blue'"
    >
      <FileSpreadsheet class="w-4 h-4" />
      {{ generalLabel }}
    </button>

    <button
      @click="downloadGeneralReport('csv')"
      :disabled="loading"
      title="Mismo informe en CSV"
      class="text-xs font-semibold text-harbor-black/50 rounded-lg px-2 py-1.5 transition-colors hover:text-harbor-blue-dark hover:bg-harbor-blue/10 disabled:opacity-40 disabled:cursor-wait"
    >
      CSV
    </button>

    <button
      disabled
      title="Próximamente"
      class="flex items-center gap-1.5 text-sm font-semibold text-harbor-black/40 border border-harbor-gray rounded-lg px-3 py-1.5 opacity-60 cursor-not-allowed"
    >
      <FileText class="w-4 h-4" />
      Descargar informe detallado
    </button>
  </div>
</template>
