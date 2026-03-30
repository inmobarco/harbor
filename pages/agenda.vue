<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { fetchAdvisors, fetchAppointments } = useAgenda()
const showCreateModal = ref(false)

onMounted(() => {
  fetchAdvisors()
  fetchAppointments()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-harbor-black mb-6">Agenda</h1>

    <!-- Calendario + Panel derecho -->
    <div class="flex gap-6 mb-6 items-start">
      <!-- Calendario (zona principal) -->
      <div class="flex-1 min-w-0">
        <AgendaCalendar />
      </div>

      <!-- Panel derecho -->
      <div class="w-80 shrink-0 sticky top-6">
        <AgendaSidebar @open-modal="showCreateModal = true" />
      </div>
    </div>

    <!-- Resumen semanal -->
    <AgendaWeeklySummary />

    <!-- Modal de creacion -->
    <AgendaAppointmentModal v-model:open="showCreateModal" />
  </div>
</template>
