<script setup lang="ts">
// Dashboard principal
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-harbor-black mb-6">Dashboard</h1>
    <!-- TODO: KPI cards, citas próximas, propiedades recientes -->
  </div>
</template>
