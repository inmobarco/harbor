<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { searchProperties } = useWasi()

onMounted(async () => {
  const data = await searchProperties()
  console.log('Propiedades:', data)
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-harbor-black mb-6">Dashboard</h1>
    <!-- TODO: KPI cards, citas próximas, propiedades recientes -->
  </div>
</template>
