<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'

const emit = defineEmits<{
  'open-modal': []
}>()
</script>

<template>
  <div class="bg-white rounded-xl border border-harbor-gray p-5 flex flex-col h-full">
    <!-- Filtro de asesores -->
    <AgendaAdvisorFilter />

    <!-- Separador -->
    <div class="border-t border-harbor-gray my-4" />

    <!-- Detalles de cita seleccionada -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <h3 class="text-xs font-semibold text-harbor-black/60 uppercase tracking-wider mb-3">
        Detalles de cita
      </h3>
      <AgendaAppointmentDetails />
    </div>

    <!-- Separador -->
    <div class="border-t border-harbor-gray my-4" />

    <!-- Boton nueva cita -->
    <Button
      class="w-full bg-harbor-blue hover:bg-harbor-blue-dark text-white font-semibold"
      @click="emit('open-modal')"
    >
      <Plus class="w-4 h-4" />
      Nueva Cita
    </Button>
  </div>
</template>
