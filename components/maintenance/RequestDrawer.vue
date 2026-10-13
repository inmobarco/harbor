<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from 'reka-ui'
import { X, XCircle } from 'lucide-vue-next'
import { formatDate, locationLabel } from '~/lib/maintenanceView'
import { STATUS_FLOW, statusLabel } from '~/types/maintenance'
import type {
  MaintenanceEvent, MaintenanceRequest, MaintenanceRequestDetail, MaintenanceStatus,
} from '~/types/maintenance'

const props = defineProps<{
  request: MaintenanceRequest | null
  now: number
}>()

const open = defineModel<boolean>('open', { default: false })

const { fetchDetail, fetchEvents } = useMaintenance()

const tab = ref<'resumen' | 'bitacora'>('resumen')

const detail = ref<MaintenanceRequestDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)

const events = ref<MaintenanceEvent[]>([])
const eventsLoading = ref(false)
const eventsError = ref<string | null>(null)

// Una respuesta de la solicitud anterior no debe pintarse en la nueva
let detailSeq = 0
let eventsSeq = 0

async function loadDetail(requestId: number) {
  const seq = ++detailSeq
  detail.value = null
  detailError.value = null
  detailLoading.value = true
  try {
    const data = await fetchDetail(requestId)
    if (seq === detailSeq) detail.value = data
  } catch (err: any) {
    if (seq === detailSeq) detailError.value = err?.message || 'Error al cargar el detalle'
  } finally {
    if (seq === detailSeq) detailLoading.value = false
  }
}

async function loadEvents(requestId: number) {
  const seq = ++eventsSeq
  events.value = []
  eventsError.value = null
  eventsLoading.value = true
  try {
    const data = await fetchEvents(requestId)
    if (seq === eventsSeq) events.value = data
  } catch (err: any) {
    if (seq === eventsSeq) eventsError.value = err?.message || 'Error al cargar la bitacora'
  } finally {
    if (seq === eventsSeq) eventsLoading.value = false
  }
}

// Cada apertura vuelve a pedir el detalle y la bitacora: otra persona pudo
// haberlos cambiado. Los adjuntos los carga el resumen.
watch(() => [open.value, props.request?.id] as const, ([isOpen, id], previous) => {
  if (!isOpen || id === undefined) return
  if (previous?.[1] !== id) tab.value = 'resumen'
  loadDetail(id)
  loadEvents(id)
}, { immediate: true })

const steps = computed(() => {
  const status = props.request?.status as MaintenanceStatus | undefined
  const current = status ? STATUS_FLOW.indexOf(status) : -1
  // Se pueden saltar etapas: las anteriores se marcan como "pasadas", no como
  // completadas. El recorrido real esta en la bitacora.
  return STATUS_FLOW.map((s, i) => ({
    status: s,
    label: statusLabel(s),
    state: i < current ? 'past' : i === current ? 'current' : 'next',
  }))
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-harbor-black/40 drawer-fade" />
      <DialogContent
        class="drawer-slide fixed inset-y-0 right-0 z-50 flex w-[580px] max-w-full flex-col bg-harbor-pure-white shadow-2xl focus:outline-none"
      >
        <template v-if="request">
          <!-- Encabezado -->
          <div class="flex flex-col gap-3 border-b border-harbor-gray px-5 pt-4 pb-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-harbor-black/50">
                  <span class="font-mono font-semibold text-harbor-black/70">{{ request.ticket }}</span>
                  · Recibida {{ formatDate(request.submittedAt ?? request.createdAt) }}
                </p>
                <DialogTitle class="mt-0.5 text-lg font-bold text-harbor-black">
                  {{ request.categoryLabel }}<template v-if="request.subcategoryLabel"> · {{ request.subcategoryLabel }}</template>
                </DialogTitle>
                <DialogDescription class="text-xs text-harbor-black/50">
                  {{ locationLabel(request) || request.propertyAddress || 'Sin inmueble' }}
                </DialogDescription>
              </div>
              <DialogClose
                class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-harbor-black/60 hover:bg-harbor-surface-gray"
                aria-label="Cerrar panel"
              >
                <X class="h-4 w-4" />
              </DialogClose>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">Estado</p>
                <MaintenanceStatusPill :status="request.status" class="mt-1" />
              </div>
              <div>
                <p class="text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">Prioridad</p>
                <MaintenancePriorityPill :priority="request.priority" class="mt-1" />
              </div>
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">Responsable</p>
                <div class="mt-1 flex items-center gap-1.5">
                  <MaintenanceAssigneeAvatar :user-id="request.assignedUserId" :name="request.assignedUserName" />
                  <span class="truncate text-sm" :class="request.assignedUserName ? 'text-harbor-black' : 'italic text-harbor-black/40'">
                    {{ request.assignedUserName || 'Sin asignar' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Etapa -->
            <div
              v-if="request.status === 'cancelada'"
              class="flex items-center gap-2 rounded-lg bg-harbor-surface-gray px-3 py-2 text-xs text-harbor-black/70"
            >
              <XCircle class="h-4 w-4" />
              Solicitud cancelada<template v-if="request.closedAt"> el {{ formatDate(request.closedAt) }}</template>. Solo lectura.
            </div>
            <ol v-else class="flex pt-1" aria-label="Etapa de la solicitud">
              <li
                v-for="(step, i) in steps"
                :key="step.status"
                class="relative flex flex-1 flex-col items-center gap-1 text-center text-[10px] font-bold leading-tight"
                :class="{
                  'text-harbor-black/60': step.state === 'past',
                  'text-harbor-black': step.state === 'current',
                  'text-harbor-black/30': step.state === 'next',
                }"
                :aria-current="step.state === 'current' ? 'step' : undefined"
              >
                <span
                  v-if="i > 0"
                  class="absolute top-[6px] right-1/2 h-0.5 w-full"
                  :class="step.state === 'next' ? 'bg-harbor-gray' : 'bg-harbor-blue'"
                />
                <span
                  class="relative z-10 h-3.5 w-3.5 rounded-full border-2"
                  :class="{
                    'border-harbor-blue bg-harbor-blue': step.state === 'past',
                    'border-harbor-blue bg-harbor-pure-white ring-4 ring-harbor-blue/20': step.state === 'current',
                    'border-harbor-gray bg-harbor-pure-white': step.state === 'next',
                  }"
                />
                {{ step.label }}
              </li>
            </ol>
          </div>

          <!-- Pestañas -->
          <div class="flex gap-1 border-b border-harbor-gray px-5" role="tablist">
            <button
              v-for="t in [{ key: 'resumen', label: 'Resumen' }, { key: 'bitacora', label: 'Bitacora' }] as const"
              :key="t.key"
              type="button"
              role="tab"
              :aria-selected="tab === t.key"
              class="-mb-px inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-sm font-bold transition-colors"
              :class="tab === t.key ? 'border-harbor-blue text-harbor-black' : 'border-transparent text-harbor-black/50 hover:text-harbor-black'"
              @click="tab = t.key"
            >
              {{ t.label }}
              <span
                v-if="t.key === 'bitacora' && events.length"
                class="rounded-full bg-harbor-surface-gray px-1.5 text-[11px] text-harbor-black/60"
              >
                {{ events.length }}
              </span>
            </button>
          </div>

          <!-- Cuerpo -->
          <div class="flex-1 overflow-y-auto px-5 py-4">
            <MaintenanceRequestSummary
              v-show="tab === 'resumen'"
              :request="request"
              :detail="detail?.id === request.id ? detail : null"
              :detail-loading="detailLoading"
              :detail-error="detailError"
              :now="now"
            />
            <MaintenanceRequestTimeline
              v-if="tab === 'bitacora'"
              :events="events"
              :loading="eventsLoading"
              :error="eventsError"
              @retry="loadEvents(request.id)"
            />
          </div>
        </template>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.drawer-fade[data-state='open'] {
  animation: drawer-fade-in 0.2s ease-out;
}
.drawer-slide[data-state='open'] {
  animation: drawer-slide-in 0.25s ease-out;
}
@keyframes drawer-fade-in {
  from { opacity: 0; }
}
@keyframes drawer-slide-in {
  from { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .drawer-fade[data-state='open'],
  .drawer-slide[data-state='open'] {
    animation: none;
  }
}
</style>
