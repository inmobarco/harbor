<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const store = usePropertiesStore()

const isInactive = computed(() => route.query.status === 'inactive')

watch(isInactive, (inactive) => {
  store.setBaseFilters(inactive ? { id_status_on_page: 2 } : {})
  store.clearFilters()
}, { immediate: true })
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-harbor-black">
        {{ isInactive ? 'Propiedades inactivas' : 'Propiedades' }}
      </h1>
      <span v-if="store.total" class="text-sm text-harbor-black/50">
        {{ store.total }} propiedades
      </span>
    </div>

    <!-- Filtros -->
    <PropertiesFilterPanel
      class="mb-6"
      @search="store.applyFilters"
      @clear="store.clearFilters"
    />

    <p v-if="store.loading" class="text-harbor-black/50">Cargando propiedades...</p>

    <template v-else>
      <div class="space-y-4">
        <PropertiesPropertyCard
          v-for="property in store.properties"
          :key="property.id_property"
          :property="property"
        />
      </div>

      <!-- Paginación -->
      <div v-if="store.totalPages > 1" class="flex items-center justify-center gap-2 mt-8">
        <button
          :disabled="store.page <= 1"
          class="px-3 py-1.5 text-sm rounded-lg border border-harbor-gray text-harbor-black/70 hover:border-harbor-blue hover:text-harbor-blue-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          @click="store.fetchProperties(store.page - 1)"
        >
          Anterior
        </button>

        <button
          v-for="p in store.totalPages"
          :key="p"
          class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
          :class="p === store.page
            ? 'bg-harbor-blue text-white border-harbor-blue'
            : 'border-harbor-gray text-harbor-black/70 hover:border-harbor-blue hover:text-harbor-blue-dark'"
          @click="store.fetchProperties(p)"
        >
          {{ p }}
        </button>

        <button
          :disabled="store.page >= store.totalPages"
          class="px-3 py-1.5 text-sm rounded-lg border border-harbor-gray text-harbor-black/70 hover:border-harbor-blue hover:text-harbor-blue-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          @click="store.fetchProperties(store.page + 1)"
        >
          Siguiente
        </button>
      </div>
    </template>
  </div>
</template>
