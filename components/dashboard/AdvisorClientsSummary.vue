<script setup lang="ts">
import { RefreshCw, Users } from 'lucide-vue-next'

const { advisors, totals, loading, error, canViewOverview, ensureLoaded, fetchOverview } = useCrm()

onMounted(() => {
  if (!canViewOverview.value) return
  ensureLoaded()
})
</script>

<template>
  <section v-if="canViewOverview" class="bg-white rounded-xl border border-harbor-gray p-6">
    <!-- Encabezado -->
    <div class="flex items-center gap-3 mb-5">
      <h2 class="text-sm font-semibold text-harbor-black/60 uppercase tracking-wider">
        Clientes por asesor
      </h2>
      <div
        v-if="totals.clients > 0"
        class="flex items-center gap-3 text-xs text-harbor-black/50"
      >
        <span class="flex items-center gap-1">
          <Users class="w-3.5 h-3.5" />
          {{ totals.clients }} en total
        </span>
        <span>{{ totals.active }} activos</span>
        <span v-if="totals.staleOver30d > 0" class="text-amber-600">
          {{ totals.staleOver30d }} sin novedad +30d
        </span>
      </div>
      <button
        type="button"
        class="ml-auto p-1.5 rounded-md text-harbor-black/40 hover:text-harbor-black hover:bg-harbor-surface-gray transition-colors disabled:opacity-40"
        :disabled="loading"
        title="Actualizar"
        @click="fetchOverview()"
      >
        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Carga inicial -->
    <div v-if="loading && !advisors.length" class="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
      <div
        v-for="i in 3"
        :key="i"
        class="bg-harbor-neutral-white rounded-lg border border-harbor-gray p-4 h-52 animate-pulse"
      />
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="flex items-center gap-3 text-sm text-harbor-error bg-harbor-error/5 border border-harbor-error/20 rounded-lg px-4 py-3"
    >
      <span class="flex-1">{{ error }}</span>
      <button
        type="button"
        class="text-xs font-semibold underline shrink-0"
        @click="fetchOverview()"
      >
        Reintentar
      </button>
    </div>

    <!-- Sin asesores mapeados -->
    <p v-else-if="!advisors.length" class="text-sm text-harbor-black/40">
      No hay asesores con propiedad dummy asignada en el CRM
    </p>

    <!-- Grid de asesores -->
    <div v-else class="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
      <DashboardAdvisorClientsCard
        v-for="item in advisors"
        :key="item.advisor.id"
        :overview="item"
      />
    </div>
  </section>
</template>
