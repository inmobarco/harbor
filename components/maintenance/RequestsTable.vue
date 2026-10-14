<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
  ageHours, compareByUpdatedDesc, formatAge, formatDate, locationLabel, slaState,
} from '~/lib/maintenanceView'
import type { MaintenanceRequest } from '~/types/maintenance'

const props = defineProps<{
  /** Abiertas ya filtradas en el cliente. */
  openRequests: MaintenanceRequest[]
  /** Cerradas y canceladas, filtradas y paginadas en el servidor. */
  closedRequests: MaintenanceRequest[]
  now: number
  selectedId: number | null
  loading?: boolean
  error?: string | null
  closedLoading?: boolean
  closedError?: string | null
  closedHasMore?: boolean
  /** Los accesos rapidos solo aplican a abiertas: las cerradas se ocultan. */
  quickActive?: boolean
}>()

const includeClosed = defineModel<boolean>('includeClosed', { default: true })

const emit = defineEmits<{ select: [requestId: number]; loadMoreClosed: [] }>()

const sortedOpen = computed(() => [...props.openRequests].sort(compareByUpdatedDesc))
const showClosed = computed(() => includeClosed.value && !props.quickActive)

const AGE_CLASSES = {
  ok: 'text-harbor-black/60',
  warn: 'text-amber-700 font-semibold',
  late: 'text-harbor-error font-semibold',
}

function onRowKey(e: KeyboardEvent, id: number) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('select', id)
  }
}
</script>

<template>
  <div class="bg-harbor-pure-white border border-harbor-gray rounded-xl overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-harbor-gray">
      <label class="flex items-center gap-2 text-sm font-semibold text-harbor-black cursor-pointer">
        <Checkbox
          :model-value="includeClosed"
          @update:model-value="v => includeClosed = v === true"
        />
        Incluir cerradas y canceladas
      </label>
      <span class="text-xs text-harbor-black/50">
        {{ sortedOpen.length }} en curso<template v-if="showClosed"> · {{ closedRequests.length }}{{ closedHasMore ? '+' : '' }} cerradas</template>
        <template v-if="includeClosed && quickActive"> · las cerradas se ocultan con los accesos rapidos</template>
      </span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[960px] text-sm">
        <thead class="bg-harbor-neutral-white text-left">
          <tr class="text-[11px] font-semibold uppercase tracking-wide text-harbor-black/50 border-b border-harbor-gray">
            <th class="px-4 py-2.5">Radicado</th>
            <th class="px-4 py-2.5">Estado</th>
            <th class="px-4 py-2.5">Prioridad</th>
            <th class="px-4 py-2.5">Categoria</th>
            <th class="px-4 py-2.5">Inmueble</th>
            <th class="px-4 py-2.5">Responsable</th>
            <th class="px-4 py-2.5">Antiguedad</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="error">
            <td colspan="7" class="px-4 py-8 text-center text-harbor-error">{{ error }}</td>
          </tr>
          <tr v-else-if="loading && !sortedOpen.length">
            <td colspan="7" class="px-4 py-8 text-center text-harbor-black/50">Cargando solicitudes...</td>
          </tr>
          <tr v-else-if="!sortedOpen.length">
            <td colspan="7" class="px-4 py-8 text-center text-harbor-black/50">No hay solicitudes en curso con estos filtros.</td>
          </tr>

          <template v-for="group in [{ key: 'open', rows: sortedOpen }, { key: 'closed', rows: showClosed ? closedRequests : [] }]" :key="group.key">
            <tr v-if="group.key === 'closed' && showClosed" class="bg-harbor-neutral-white">
              <td colspan="7" class="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-harbor-black/50">
                Cerradas y canceladas
              </td>
            </tr>
            <tr
              v-for="r in group.rows"
              :key="r.id"
              tabindex="0"
              class="align-top border-b border-harbor-gray/50 cursor-pointer transition-colors"
              :class="[
                r.id === selectedId ? 'bg-harbor-blue/10' : 'hover:bg-harbor-neutral-white',
                group.key === 'closed' ? 'text-harbor-black/60' : '',
              ]"
              @click="emit('select', r.id)"
              @keydown="onRowKey($event, r.id)"
            >
              <td class="px-4 py-2.5 whitespace-nowrap">
                <p class="font-mono font-semibold">{{ r.ticket }}</p>
                <p class="text-xs text-harbor-black/50 mt-0.5">{{ formatDate(r.submittedAt ?? r.createdAt) }}</p>
              </td>
              <td class="px-4 py-2.5 whitespace-nowrap">
                <MaintenanceStatusPill :status="r.status" />
                <p v-if="r.closedAt" class="text-xs text-harbor-black/50 mt-1">{{ formatDate(r.closedAt) }}</p>
                <p v-if="r.needsReview" class="flex items-center gap-1 mt-1 text-xs font-semibold text-amber-700">
                  <AlertTriangle class="h-3.5 w-3.5" /> Revisar
                </p>
              </td>
              <td class="px-4 py-2.5"><MaintenancePriorityPill :priority="r.priority" /></td>
              <td class="px-4 py-2.5 min-w-[180px]">
                <p class="font-semibold text-harbor-black">{{ r.categoryLabel }}</p>
                <p v-if="r.subcategoryLabel" class="text-xs text-harbor-black/50 mt-0.5">{{ r.subcategoryLabel }}</p>
              </td>
              <td class="px-4 py-2.5 min-w-[200px]">
                <p>{{ locationLabel(r) || r.propertyAddress || '—' }}</p>
                <p v-if="r.city" class="text-xs text-harbor-black/50 mt-0.5">{{ r.city }}</p>
                <p v-if="r.contractNumber" class="text-xs text-harbor-black/50 mt-0.5 font-mono">{{ r.contractNumber }}</p>
              </td>
              <td class="px-4 py-2.5 min-w-[150px]">
                <span v-if="r.assignedUserName">{{ r.assignedUserName }}</span>
                <span v-else class="italic text-harbor-black/40">Sin asignar</span>
              </td>
              <td class="px-4 py-2.5 whitespace-nowrap text-xs tabular-nums">
                <span
                  v-if="group.key === 'open'"
                  :class="AGE_CLASSES[slaState(r, now) ?? 'ok']"
                >
                  {{ formatAge(ageHours(r, now)) }}<template v-if="slaState(r, now) === 'late'"> · vencida</template>
                </span>
                <span v-else class="text-harbor-black/40">—</span>
              </td>
            </tr>
          </template>

          <tr v-if="showClosed && closedError">
            <td colspan="7" class="px-4 py-4 text-center text-sm text-harbor-error">{{ closedError }}</td>
          </tr>
          <tr v-else-if="showClosed && closedLoading && !closedRequests.length">
            <td colspan="7" class="px-4 py-4 text-center text-sm text-harbor-black/50">Cargando cerradas...</td>
          </tr>
          <tr v-else-if="showClosed && !closedLoading && !closedRequests.length">
            <td colspan="7" class="px-4 py-4 text-center text-sm text-harbor-black/50">No hay cerradas ni canceladas con estos filtros.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showClosed && closedHasMore" class="flex justify-center px-4 py-3 border-t border-harbor-gray">
      <Button variant="outline" size="sm" :disabled="closedLoading" @click="emit('loadMoreClosed')">
        {{ closedLoading ? 'Cargando...' : 'Cargar mas cerradas' }}
      </Button>
    </div>
  </div>
</template>
