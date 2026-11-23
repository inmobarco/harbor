<script setup lang="ts">
import type { Property } from '~/types/property'

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

const editing = ref<Property | null>(null)
const editOpen = ref(false)

function openEdit(property: Property) {
  editing.value = property
  editOpen.value = true
}

const searching = computed(() => !!store.referenceSearch.trim())

const countLabel = computed(() => {
  if (!store.complete && store.serverTotal) {
    return `Cargando ${store.loadedCount} de ${store.serverTotal}...`
  }
  if (searching.value) {
    return `${store.total} de ${store.serverTotal} propiedades`
  }
  return `${store.total} propiedades`
})

function goToPage(p: number) {
  store.setPage(p)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-harbor-black">
        {{ isInactive ? 'Propiedades inactivas' : 'Propiedades' }}
      </h1>
      <div class="flex items-center gap-3">
        <span v-if="store.serverTotal" class="text-sm text-harbor-black/50">
          {{ countLabel }}
        </span>
        <PropertiesReportActions v-if="!isInactive" />
      </div>
    </div>

    <!-- Filtros -->
    <PropertiesFilterPanel
      class="mb-6"
      @search="(filters, refSearch) => store.applyFilters(filters, refSearch)"
      @reference="store.setReferenceSearch"
      @clear="store.clearFilters"
    />

    <p v-if="store.loading && !store.properties.length" class="text-harbor-black/50">Cargando propiedades...</p>

    <template v-else>
      <p
        v-if="searching && !store.complete"
        class="mb-4 text-sm text-harbor-black/50"
      >
        Buscando en el resto del listado...
      </p>

      <p
        v-if="!store.pagedProperties.length && store.complete"
        class="py-12 text-center text-harbor-black/50"
      >
        {{ searching
          ? `No hay ${isInactive ? 'propiedades inactivas' : 'propiedades activas'} con la referencia "${store.referenceSearch.trim()}".`
          : 'No hay propiedades con estos filtros.' }}
      </p>

      <div class="space-y-4">
        <PropertiesPropertyCard
          v-for="property in store.pagedProperties"
          :key="property.id_property"
          :property="property"
          @edit="openEdit"
        />
      </div>

      <!-- Paginación -->
      <div v-if="store.totalPages > 1" class="flex items-center justify-center gap-2 mt-8">
        <button
          :disabled="store.page <= 1"
          class="px-3 py-1.5 text-sm rounded-lg border border-harbor-gray text-harbor-black/70 hover:border-harbor-blue hover:text-harbor-blue-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          @click="goToPage(store.page - 1)"
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
          @click="goToPage(p)"
        >
          {{ p }}
        </button>

        <button
          :disabled="store.page >= store.totalPages"
          class="px-3 py-1.5 text-sm rounded-lg border border-harbor-gray text-harbor-black/70 hover:border-harbor-blue hover:text-harbor-blue-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          @click="goToPage(store.page + 1)"
        >
          Siguiente
        </button>
      </div>
    </template>

    <PropertiesEditPropertyModal
      v-if="!isInactive"
      v-model:open="editOpen"
      :property="editing"
      @saved="store.refresh()"
    />
  </div>
</template>
