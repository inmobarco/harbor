<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from 'reka-ui'
import {
  AlertTriangle, CheckCircle2, File as FileIcon, FileText, Film, Image as ImageIcon, Music, X, XCircle,
} from 'lucide-vue-next'
import {
  ageHours, formatAge, formatDate, humanize, locationLabel, slaHours, slaState,
} from '~/lib/maintenanceView'
import {
  ATTACHMENT_PHASES, STATUS_FLOW, previewKind, statusLabel,
} from '~/types/maintenance'
import type { MaintenanceAttachment, MaintenanceRequest, MaintenanceStatus } from '~/types/maintenance'

const props = defineProps<{
  request: MaintenanceRequest | null
  now: number
}>()

const open = defineModel<boolean>('open', { default: false })

const { fetchAttachments } = useMaintenance()

// ─── Adjuntos ───────────────────────────────────────────────────────────────
const attachments = ref<MaintenanceAttachment[]>([])
const attachmentsLoading = ref(false)
const attachmentsError = ref<string | null>(null)
const brokenThumbs = ref(new Set<number>())
const viewerOpen = ref(false)
const viewerInitialId = ref<number | null>(null)

// Evita que los adjuntos de una solicitud anterior aparezcan en la nueva
let attachmentsSeq = 0

async function loadAttachments() {
  const r = props.request
  attachments.value = []
  attachmentsError.value = null
  brokenThumbs.value = new Set()
  if (!r || !r.attachmentCount) return

  const seq = ++attachmentsSeq
  attachmentsLoading.value = true
  try {
    const list = await fetchAttachments(r.id)
    if (seq === attachmentsSeq) attachments.value = list
  } catch (err: any) {
    if (seq === attachmentsSeq) attachmentsError.value = err?.message || 'Error al cargar los adjuntos'
  } finally {
    if (seq === attachmentsSeq) attachmentsLoading.value = false
  }
}

watch(() => [open.value, props.request?.id] as const, ([isOpen]) => {
  if (isOpen) loadAttachments()
}, { immediate: true })

const phases = computed(() =>
  ATTACHMENT_PHASES.map(p => ({
    ...p,
    items: attachments.value.filter(a => a.phase === p.value),
  }))
)

function openViewer(a: MaintenanceAttachment) {
  viewerInitialId.value = a.id
  viewerOpen.value = true
}

function markBroken(id: number) {
  brokenThumbs.value = new Set(brokenThumbs.value).add(id)
}

function iconFor(a: MaintenanceAttachment) {
  switch (previewKind(a.contentType)) {
    case 'image': return ImageIcon
    case 'video': return Film
    case 'audio': return Music
    case 'pdf': return FileText
    default: return FileIcon
  }
}

// ─── Resumen ────────────────────────────────────────────────────────────────
const sla = computed(() => props.request ? slaState(props.request, props.now) : null)

const steps = computed(() => {
  const status = props.request?.status as MaintenanceStatus | undefined
  const current = status ? STATUS_FLOW.indexOf(status) : -1
  // Se puede saltar etapas y no hay historial aun: las anteriores se marcan
  // como "pasadas", no como completadas
  return STATUS_FLOW.map((s, i) => ({
    status: s,
    label: statusLabel(s),
    state: i < current ? 'past' : i === current ? 'current' : 'next',
  }))
})

/** El listado trae solo 160 caracteres de la descripcion. */
const descriptionTruncated = computed(() => (props.request?.descriptionPreview?.length ?? 0) >= 160)

const entryLabel = computed(() => {
  const v = props.request?.entryAuthorization
  if (v === true) return { text: 'Si, autoriza ingreso', cls: 'text-emerald-700' }
  if (v === false) return { text: 'No autoriza', cls: 'text-harbor-error' }
  if (v) return { text: humanize(v), cls: '' }
  return { text: '—', cls: '' }
})

const SLA_TEXT = {
  ok: 'text-harbor-black/50',
  warn: 'text-amber-700',
  late: 'text-harbor-error',
}
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

          <!-- Cuerpo -->
          <div class="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
            <div
              v-if="request.needsReview"
              class="flex items-start gap-2 rounded-lg bg-harbor-warning/15 px-3 py-2.5 text-sm font-semibold text-amber-700"
            >
              <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
              <span>{{ request.reviewReason || 'Marcada para revision' }}</span>
            </div>

            <section>
              <h5 class="mb-2 text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">Descripcion del reportante</h5>
              <p class="rounded-lg border border-harbor-gray/60 bg-harbor-neutral-white p-3 text-sm leading-relaxed text-harbor-black">
                {{ request.descriptionPreview || 'Sin descripcion.' }}<template v-if="descriptionTruncated">…</template>
              </p>
              <p v-if="descriptionTruncated" class="mt-1 text-xs text-harbor-black/40">
                Vista previa de 160 caracteres. El texto completo llegara con el detalle de la solicitud.
              </p>
            </section>

            <section>
              <h5 class="mb-2 text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">Reportante e inmueble</h5>
              <dl class="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                <div>
                  <dt class="text-xs font-semibold text-harbor-black/50">Reportante</dt>
                  <dd class="font-semibold text-harbor-black">{{ request.reporterName || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold text-harbor-black/50">Telefono</dt>
                  <dd class="font-mono font-semibold text-harbor-black">{{ request.reporterPhone || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold text-harbor-black/50">Tipo de cliente</dt>
                  <dd class="font-semibold text-harbor-black">{{ humanize(request.clientType) }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold text-harbor-black/50">Contrato</dt>
                  <dd class="flex items-center gap-1 font-semibold text-harbor-black">
                    <span class="font-mono">{{ request.contractNumber || '—' }}</span>
                    <template v-if="request.contractNumber">
                      <span v-if="request.contractVerified" class="inline-flex items-center gap-0.5 text-xs text-emerald-700">
                        <CheckCircle2 class="h-3.5 w-3.5" /> verificado
                      </span>
                      <span v-else class="text-xs text-amber-700">· sin verificar</span>
                    </template>
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold text-harbor-black/50">Inmueble</dt>
                  <dd class="font-semibold text-harbor-black">{{ locationLabel(request) || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold text-harbor-black/50">Direccion</dt>
                  <dd class="font-semibold text-harbor-black break-words">{{ request.propertyAddress || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold text-harbor-black/50">Ingreso al inmueble</dt>
                  <dd class="font-semibold" :class="entryLabel.cls || 'text-harbor-black'">{{ entryLabel.text }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold text-harbor-black/50">¿Ocurre ahora?</dt>
                  <dd class="font-semibold" :class="request.isHappeningNow ? 'text-harbor-error' : 'text-harbor-black'">
                    {{ request.isHappeningNow ? 'Si' : 'No' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold text-harbor-black/50">A cargo de</dt>
                  <dd class="font-semibold text-harbor-black">{{ humanize(request.responsibleParty) }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold text-harbor-black/50">Antiguedad</dt>
                  <dd class="font-semibold tabular-nums" :class="sla ? SLA_TEXT[sla] : 'text-harbor-black'">
                    {{ formatAge(ageHours(request, now)) }}
                    <span v-if="sla" class="text-xs font-medium">
                      de {{ slaHours(request) }} h<template v-if="sla === 'late'"> · vencida</template>
                    </span>
                  </dd>
                </div>
                <div v-if="request.closedAt">
                  <dt class="text-xs font-semibold text-harbor-black/50">{{ request.status === 'cancelada' ? 'Cancelada' : 'Cerrada' }}</dt>
                  <dd class="font-semibold text-harbor-black">{{ formatDate(request.closedAt) }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-semibold text-harbor-black/50">Ultima actualizacion</dt>
                  <dd class="font-semibold text-harbor-black">{{ formatDate(request.updatedAt) }}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h5 class="mb-2 text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">
                Adjuntos<template v-if="request.attachmentCount"> ({{ request.attachmentCount }})</template>
              </h5>

              <p v-if="!request.attachmentCount" class="text-sm text-harbor-black/40">Esta solicitud no tiene archivos.</p>
              <p v-else-if="attachmentsLoading" class="text-sm text-harbor-black/50">Cargando adjuntos...</p>
              <p v-else-if="attachmentsError" class="text-sm text-harbor-error">{{ attachmentsError }}</p>

              <div v-else class="space-y-3">
                <div v-for="phase in phases" :key="phase.value">
                  <p class="mb-1.5 text-xs font-bold text-harbor-black/60">{{ phase.label }}</p>
                  <div class="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
                    <button
                      v-for="a in phase.items"
                      :key="a.id"
                      type="button"
                      class="relative grid aspect-square place-items-center overflow-hidden rounded-lg border border-harbor-gray bg-harbor-surface-gray transition-colors hover:border-harbor-blue"
                      :title="a.originalName ?? undefined"
                      @click="openViewer(a)"
                    >
                      <img
                        v-if="previewKind(a.contentType) === 'image' && !brokenThumbs.has(a.id)"
                        :src="a.url"
                        :alt="a.originalName ?? 'Adjunto'"
                        loading="lazy"
                        class="h-full w-full object-cover"
                        @error="markBroken(a.id)"
                      />
                      <span v-else class="flex flex-col items-center gap-1 px-1.5 text-center text-[10px] font-semibold text-harbor-black/60">
                        <component :is="iconFor(a)" class="h-5 w-5" />
                        <span class="line-clamp-2 break-all">{{ a.originalName || `Archivo ${a.position}` }}</span>
                      </span>
                    </button>
                    <div
                      v-if="!phase.items.length"
                      class="grid aspect-square place-items-center rounded-lg border-[1.5px] border-dashed border-harbor-gray text-[10px] font-semibold text-harbor-black/40"
                    >
                      Sin archivos
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <MaintenanceAttachmentsModal
            v-model:open="viewerOpen"
            :request="request"
            :initial-id="viewerInitialId"
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
