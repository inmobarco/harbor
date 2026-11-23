<script setup lang="ts">
definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-harbor-black">Dashboard</h1>

    <!-- Captaciones de la semana en curso y la pasada, por asesor -->
    <DashboardAcquisitionsSummary />
  </div>
</template>
