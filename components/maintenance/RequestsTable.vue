<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Flame, Paperclip } from 'lucide-vue-next'
import { priorityLabel, statusLabel } from '~/types/maintenance'
import type { MaintenanceRequest } from '~/types/maintenance'

defineProps<{
  requests: MaintenanceRequest[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{ attachments: [request: MaintenanceRequest] }>()

const STATUS_CLASSES: Record<string, string> = {
  recibida: 'bg-harbor-info/10 text-harbor-info',
  en_revision: 'bg-harbor-purple/10 text-harbor-purple',
  esperando_aprobacion: 'bg-harbor-warning/15 text-amber-700',
  programada: 'bg-harbor-blue/15 text-harbor-blue-dark',
  en_ejecucion: 'bg-harbor-blue-dark/15 text-harbor-blue-dark',
  resuelta: 'bg-harbor-success/15 text-emerald-700',
  cerrada: 'bg-harbor-surface-gray text-harbor-black/60',
  cancelada: 'bg-harbor-surface-gray text-harbor-black/40 line-through',
}

const PRIORITY_CLASSES: Record<string, string> = {
  urgente: 'bg-harbor-error text-white',
  alta: 'bg-harbor-error/10 text-harbor-error',
  media: 'bg-harbor-warning/15 text-amber-700',
  baja: 'bg-harbor-surface-gray text-harbor-black/60',
}

const dateFormat = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : dateFormat.format(d)
}

/** Valores tipo codigo (propietario, arrendatario...) a texto legible. */
function humanize(value: string | null): string {
  if (!value) return '—'
  const s = value.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function entryAuthLabel(value: string | boolean | null): string | null {
  if (value === null) return null
  if (typeof value === 'boolean') return value ? 'Autoriza ingreso' : 'No autoriza ingreso'
  return humanize(value)
}

function location(r: MaintenanceRequest): string {
  return [r.aptNum && `Apto ${r.aptNum}`, r.unit].filter(Boolean).join(' · ')
}
</script>

<template>
  <div class="flex flex-col h-full bg-harbor-pure-white border border-harbor-gray rounded-xl overflow-hidden">
    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead class="sticky top-0 z-10 bg-harbor-neutral-white text-left">
          <tr class="text-xs font-semibold text-harbor-black/60 uppercase tracking-wide border-b border-harbor-gray">
            <th class="px-4 py-3">Radicado</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3">Prioridad</th>
            <th class="px-4 py-3">Categoria</th>
            <th class="px-4 py-3">Reportante</th>
            <th class="px-4 py-3">Inmueble</th>
            <th class="px-4 py-3">Responsable</th>
            <th class="px-4 py-3">Actualizada</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="loading && !requests.length">
            <td colspan="8" class="px-4 py-10 text-center text-harbor-black/50">Cargando solicitudes...</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="8" class="px-4 py-10 text-center text-harbor-error">{{ error }}</td>
          </tr>
          <tr v-else-if="!requests.length">
            <td colspan="8" class="px-4 py-10 text-center text-harbor-black/50">
              No hay solicitudes con estos filtros.
            </td>
          </tr>

          <template v-else>
            <tr
              v-for="r in requests"
              :key="r.id"
              class="align-top border-b border-harbor-gray/50 hover:bg-harbor-neutral-white transition-colors"
              :class="{ 'opacity-50': !r.isActive }"
            >
              <!-- Radicado -->
              <td class="px-4 py-3 whitespace-nowrap">
                <p class="font-mono font-semibold text-harbor-black">{{ r.ticket }}</p>
                <p class="text-xs text-harbor-black/50 mt-0.5">{{ formatDate(r.submittedAt ?? r.createdAt) }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    v-if="r.isHappeningNow"
                    class="inline-flex items-center gap-1 text-xs font-semibold text-harbor-error"
                    title="El reportante indica que esta ocurriendo ahora"
                  >
                    <Flame class="h-3.5 w-3.5" /> Ahora
                  </span>
                  <button
                    v-if="r.attachmentCount"
                    type="button"
                    class="inline-flex items-center gap-1 text-xs font-semibold text-harbor-blue-dark hover:underline"
                    @click="emit('attachments', r)"
                  >
                    <Paperclip class="h-3.5 w-3.5" />
                    Ver adjuntos ({{ r.attachmentCount }})
                  </button>
                </div>
              </td>
  
              <!-- Estado -->
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :class="STATUS_CLASSES[r.status] ?? 'bg-harbor-surface-gray text-harbor-black/60'"
                >
                  {{ statusLabel(r.status) }}
                </span>
                <p
                  v-if="r.needsReview"
                  class="flex items-start gap-1 mt-1.5 text-xs text-amber-700 max-w-[180px] whitespace-normal"
                >
                  <AlertTriangle class="h-3.5 w-3.5 shrink-0 mt-px" />
                  <span>{{ r.reviewReason || 'Requiere revision' }}</span>
                </p>
                <p v-if="r.closedAt" class="text-xs text-harbor-black/50 mt-1">
                  Cerrada {{ formatDate(r.closedAt) }}
                </p>
              </td>
  
              <!-- Prioridad -->
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :class="PRIORITY_CLASSES[r.priority] ?? 'bg-harbor-surface-gray text-harbor-black/60'"
                >
                  {{ priorityLabel(r.priority) }}
                </span>
              </td>
  
              <!-- Categoria + descripcion -->
              <td class="px-4 py-3 min-w-[240px] max-w-[340px]">
                <p class="font-semibold text-harbor-black">
                  {{ r.categoryLabel }}<span v-if="r.subcategoryLabel" class="font-normal text-harbor-black/60"> · {{ r.subcategoryLabel }}</span>
                </p>
                <p v-if="r.descriptionPreview" class="text-xs text-harbor-black/60 mt-0.5 line-clamp-2">
                  {{ r.descriptionPreview }}
                </p>
              </td>
  
              <!-- Reportante -->
              <td class="px-4 py-3 min-w-[160px]">
                <p class="text-harbor-black">{{ r.reporterName || '—' }}</p>
                <p v-if="r.reporterPhone" class="text-xs font-mono text-harbor-black/60 mt-0.5">{{ r.reporterPhone }}</p>
                <p v-if="r.clientType" class="text-xs text-harbor-black/50 mt-0.5">{{ humanize(r.clientType) }}</p>
              </td>
  
              <!-- Inmueble -->
              <td class="px-4 py-3 min-w-[200px] max-w-[280px]">
                <p class="text-harbor-black">{{ r.propertyAddress || '—' }}</p>
                <p v-if="location(r)" class="text-xs text-harbor-black/60 mt-0.5">{{ location(r) }}</p>
                <p v-if="r.contractNumber" class="flex items-center gap-1 text-xs text-harbor-black/60 mt-0.5">
                  Contrato <span class="font-mono">{{ r.contractNumber }}</span>
                  <CheckCircle2
                    v-if="r.contractVerified"
                    class="h-3.5 w-3.5 text-harbor-success"
                    title="Contrato verificado"
                  />
                  <span v-else class="text-amber-700">(sin verificar)</span>
                </p>
                <p v-if="entryAuthLabel(r.entryAuthorization)" class="text-xs text-harbor-black/50 mt-0.5">
                  {{ entryAuthLabel(r.entryAuthorization) }}
                </p>
              </td>
  
              <!-- Responsable -->
              <td class="px-4 py-3 min-w-[140px]">
                <p v-if="r.assignedUserName" class="text-harbor-black">{{ r.assignedUserName }}</p>
                <p v-else class="text-harbor-black/40 italic">Sin asignar</p>
                <p v-if="r.responsibleParty" class="text-xs text-harbor-black/50 mt-0.5">
                  A cargo de: {{ humanize(r.responsibleParty) }}
                </p>
              </td>
  
              <!-- Actualizada -->
              <td class="px-4 py-3 whitespace-nowrap text-xs text-harbor-black/60">
                {{ formatDate(r.updatedAt) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
