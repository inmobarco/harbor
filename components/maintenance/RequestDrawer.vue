<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from 'reka-ui'
import { X, XCircle } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { NEXT_STEPS, formatDate, isFinal, locationLabel } from '~/lib/maintenanceView'
import { MAINTENANCE_PRIORITIES, STATUS_FLOW, statusLabel } from '~/types/maintenance'
import type {
  MaintenanceEvent, MaintenancePriority, MaintenanceRequest, MaintenanceRequestDetail,
  MaintenanceRequestUpdate, MaintenanceStatus, ResponsibleParty,
} from '~/types/maintenance'

const props = defineProps<{
  request: MaintenanceRequest | null
  now: number
}>()

const open = defineModel<boolean>('open', { default: false })
/** Abrir otra solicitud en el panel (p. ej. una del mismo envio). */
const emit = defineEmits<{ select: [requestId: number] }>()

const { fetchDetail, fetchEvents, updateRequest, staff } = useMaintenance()

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

// ─── Edicion ────────────────────────────────────────────────────────────────
const final = computed(() => !!props.request && isFinal(props.request))
type EditField = 'priority' | 'assignee' | 'review' | 'party'
const saving = ref<EditField | null>(null)
const editError = ref<string | null>(null)

const statusDialogOpen = ref(false)
const statusPreset = ref<MaintenanceStatus | null>(null)

const nextSteps = computed(() =>
  props.request ? NEXT_STEPS[props.request.status as MaintenanceStatus] ?? [] : []
)

function openStatusDialog(preset: MaintenanceStatus | null) {
  statusPreset.value = preset
  statusDialogOpen.value = true
}

/**
 * El store ya actualizo la tarjeta. El PATCH devuelve la solicitud completa,
 * asi que sirve de detalle; solo hace falta volver a pedir la bitacora.
 */
function refreshPanel(updated: MaintenanceRequestDetail) {
  detailSeq++ // descarta un detalle anterior que aun venga en camino
  detail.value = updated
  detailError.value = null
  detailLoading.value = false
  loadEvents(updated.id)
}

async function applyChange(field: EditField, payload: MaintenanceRequestUpdate) {
  if (!props.request || saving.value) return
  saving.value = field
  editError.value = null
  try {
    refreshPanel(await updateRequest(props.request.id, payload))
  } catch (err: any) {
    editError.value = err?.message || 'No se pudo guardar el cambio'
  } finally {
    saving.value = null
  }
}

function onPriority(value: any) {
  if (!value || value === props.request?.priority) return
  applyChange('priority', { priority: value as MaintenancePriority })
}

// radix Select no admite value vacio: 'none' representa "sin asignar"
const NO_ASSIGNEE = 'none'

/** Por ahora solo los managers reciben solicitudes; se agrega el actual si no lo es. */
const assigneeOptions = computed(() => {
  const options = staff.value.map(s => ({ id: s.id, name: s.name }))
  const r = props.request
  if (r?.assignedUserId != null && !options.some(o => o.id === r.assignedUserId)) {
    options.unshift({ id: r.assignedUserId, name: r.assignedUserName ?? `Usuario ${r.assignedUserId}` })
  }
  return options
})

function onAssignee(value: any) {
  const next = value === NO_ASSIGNEE ? null : Number(value)
  if (next === (props.request?.assignedUserId ?? null)) return
  applyChange('assignee', { assigned_user_id: next })
}

function setResponsibleParty(value: ResponsibleParty | null) {
  if (value === (props.request?.responsibleParty ?? null)) return
  applyChange('party', { responsible_party: value })
}

function setReview(payload: { needsReview: boolean; reason: string | null }) {
  applyChange('review', {
    needs_review: payload.needsReview,
    ...(payload.needsReview ? { review_reason: payload.reason } : {}),
  })
}

function onNoteAdded(event: MaintenanceEvent) {
  events.value = [...events.value, event]
}

watch(() => props.request?.id, () => { editError.value = null })

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
                <MaintenancePriorityPill v-if="final" :priority="request.priority" class="mt-1" />
                <Select
                  v-else
                  :model-value="request.priority"
                  :disabled="saving !== null"
                  @update:model-value="onPriority"
                >
                  <SelectTrigger class="mt-1 h-8 text-sm" aria-label="Prioridad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="p in MAINTENANCE_PRIORITIES" :key="p.value" :value="p.value">{{ p.label }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">Responsable</p>
                <div v-if="final" class="mt-1 flex items-center gap-1.5">
                  <MaintenanceAssigneeAvatar :user-id="request.assignedUserId" :name="request.assignedUserName" />
                  <span class="truncate text-sm" :class="request.assignedUserName ? 'text-harbor-black' : 'italic text-harbor-black/40'">
                    {{ request.assignedUserName || 'Sin asignar' }}
                  </span>
                </div>
                <Select
                  v-else
                  :model-value="request.assignedUserId != null ? String(request.assignedUserId) : NO_ASSIGNEE"
                  :disabled="saving !== null"
                  @update:model-value="onAssignee"
                >
                  <SelectTrigger class="mt-1 h-8 text-sm" aria-label="Responsable">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="NO_ASSIGNEE">Sin asignar</SelectItem>
                    <SelectItem v-for="u in assigneeOptions" :key="u.id" :value="String(u.id)">{{ u.name }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p v-if="editError" class="text-sm text-harbor-error">{{ editError }}</p>

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

            <div v-if="!final" class="flex flex-wrap items-center gap-2">
              <Button
                v-for="(step, i) in nextSteps"
                :key="step.to"
                size="sm"
                :variant="i === 0 ? 'default' : 'outline'"
                @click="openStatusDialog(step.to)"
              >
                {{ step.label }}
              </Button>
              <Button size="sm" variant="outline" @click="openStatusDialog(null)">Otro estado</Button>
              <Button
                size="sm"
                variant="ghost"
                class="ml-auto text-harbor-error hover:bg-harbor-error/10 hover:text-harbor-error"
                @click="openStatusDialog('cancelada')"
              >
                Cancelar
              </Button>
            </div>
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
              :editable="!final"
              :review-saving="saving === 'review'"
              :party-saving="saving === 'party'"
              @set-review="setReview"
              @set-responsible-party="setResponsibleParty"
              @select="id => emit('select', id)"
            />
            <MaintenanceRequestTimeline
              v-if="tab === 'bitacora'"
              :events="events"
              :loading="eventsLoading"
              :error="eventsError"
              :request-id="request.id"
              @retry="loadEvents(request.id)"
              @note-added="onNoteAdded"
            />
          </div>

          <MaintenanceStatusChangeDialog
            v-model:open="statusDialogOpen"
            :request="request"
            :preset="statusPreset"
            @saved="refreshPanel"
          />
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
