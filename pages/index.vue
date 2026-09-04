<script setup lang="ts">
//inicio
definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-harbor-black">Dashboard</h1>

    <!-- Resumen de clientes del CRM por asesor -->
    <DashboardAdvisorClientsSummary />

    <!-- TODO: KPI cards, citas próximas, propiedades recientes -->
  </div>
</template>
