<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import type { MaintenanceRequest } from '~/types/maintenance'

definePageMeta({ layout: 'default' })

const {
  requests, loading, error, offset, hasMore, pageSize,
  fetchRequests, nextPage, prevPage,
} = useMaintenance()

onMounted(fetchRequests)

const attachmentsOpen = ref(false)
const attachmentsRequest = ref<MaintenanceRequest | null>(null)

function showAttachments(request: MaintenanceRequest) {
  attachmentsRequest.value = request
  attachmentsOpen.value = true
}

const rangeLabel = computed(() => {
  if (!requests.value.length) return ''
  return `${offset.value + 1}–${offset.value + requests.value.length}`
})
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-7rem)]">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-harbor-black">Mantenimiento</h1>
        <p class="text-sm text-harbor-black/50 mt-0.5">
          Solicitudes de mantenimiento reportadas por propietarios y arrendatarios.
        </p>
      </div>
      <Button variant="outline" size="sm" :disabled="loading" @click="fetchRequests">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        Actualizar
      </Button>
    </div>

    <MaintenanceRequestFilters class="mb-4" />

    <div class="flex-1 min-h-0">
      <MaintenanceRequestsTable
        :requests="requests"
        :loading="loading"
        :error="error"
        @attachments="showAttachments"
      />
    </div>

    <!-- Paginacion: el endpoint no devuelve total, solo se sabe si la pagina vino llena -->
    <div v-if="offset > 0 || hasMore" class="flex items-center justify-end gap-3 mt-3 text-sm text-harbor-black/60">
      <span>Mostrando {{ rangeLabel }}</span>
      <Button variant="outline" size="sm" :disabled="loading || offset === 0" @click="prevPage">
        <ChevronLeft class="h-4 w-4" />
        Anterior
      </Button>
      <Button variant="outline" size="sm" :disabled="loading || !hasMore" @click="nextPage">
        Siguientes {{ pageSize }}
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>

    <MaintenanceAttachmentsModal v-model:open="attachmentsOpen" :request="attachmentsRequest" />
  </div>
</template>
