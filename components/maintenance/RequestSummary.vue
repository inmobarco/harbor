<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AlertTriangle, CheckCircle2, File as FileIcon, FileText, Film, Image as ImageIcon, Music, Trash2,
} from 'lucide-vue-next'
import {
  ageHours, formatAge, formatDate, humanize, locationLabel, slaHours, slaState,
} from '~/lib/maintenanceView'
import { ATTACHMENT_PHASES, previewKind } from '~/types/maintenance'
import type {
  MaintenanceAttachment, MaintenanceRequest, MaintenanceRequestDetail,
} from '~/types/maintenance'

const props = defineProps<{
  /** Fila del listado: se muestra de inmediato mientras llega el detalle. */
  request: MaintenanceRequest
  detail: MaintenanceRequestDetail | null
  detailLoading?: boolean
  detailError?: string | null
  now: number
}>()

const { fetchAttachments } = useMaintenance()

/** El detalle trae mas campos; mientras llega se usa la fila del listado. */
const r = computed<MaintenanceRequest>(() => props.detail ?? props.request)

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
  const request = props.request
  attachments.value = []
  attachmentsError.value = null
  brokenThumbs.value = new Set()
  if (!request.attachmentCount) return

  const seq = ++attachmentsSeq
  attachmentsLoading.value = true
  try {
    const list = await fetchAttachments(request.id)
    if (seq === attachmentsSeq) attachments.value = list
  } catch (err: any) {
    if (seq === attachmentsSeq) attachmentsError.value = err?.message || 'Error al cargar los adjuntos'
  } finally {
    if (seq === attachmentsSeq) attachmentsLoading.value = false
  }
}

watch(() => props.request.id, loadAttachments, { immediate: true })

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

// ─── Datos ──────────────────────────────────────────────────────────────────
const sla = computed(() => slaState(r.value, props.now))

const description = computed(() => props.detail?.description ?? r.value.descriptionPreview)
/** Sin detalle solo se tiene el recorte de 160 caracteres del listado. */
const descriptionTruncated = computed(() =>
  !props.detail && (r.value.descriptionPreview?.length ?? 0) >= 160
)

const entryLabel = computed(() => {
  const v = r.value.entryAuthorization
  if (v === true) return { text: 'Si, autoriza ingreso', cls: 'text-emerald-700' }
  if (v === false) return { text: 'No autoriza', cls: 'text-harbor-error' }
  if (v) return { text: humanize(v), cls: '' }
  return { text: '—', cls: '' }
})

const availability = computed(() => {
  const d = props.detail
  if (!d) return null
  const days = d.availableDays.map(humanize).join(', ')
  if (!days && !d.timeSlot && !d.availabilityNotes) return null
  return { days, timeSlot: d.timeSlot ? humanize(d.timeSlot) : null, notes: d.availabilityNotes }
})

const rawPayloadText = computed(() => {
  const payload = props.detail?.rawPayload
  if (payload === null || payload === undefined) return null
  return typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
})

const SLA_TEXT = {
  ok: 'text-harbor-black/50',
  warn: 'text-amber-700',
  late: 'text-harbor-error',
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p v-if="detailError" class="rounded-lg bg-harbor-error/10 px-3 py-2 text-sm text-harbor-error">
      {{ detailError }}. Se muestran los datos del listado.
    </p>

    <div
      v-if="!r.isActive"
      class="flex items-start gap-2 rounded-lg bg-harbor-surface-gray px-3 py-2.5 text-sm font-semibold text-harbor-black/70"
    >
      <Trash2 class="mt-0.5 h-4 w-4 shrink-0" />
      <span>Esta solicitud fue eliminada. Se conserva solo para consulta.</span>
    </div>

    <div
      v-if="r.needsReview"
      class="flex items-start gap-2 rounded-lg bg-harbor-warning/15 px-3 py-2.5 text-sm font-semibold text-amber-700"
    >
      <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
      <span>{{ r.reviewReason || 'Marcada para revision' }}</span>
    </div>

    <section>
      <h5 class="mb-2 text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">Descripcion del reportante</h5>
      <p class="whitespace-pre-line rounded-lg border border-harbor-gray/60 bg-harbor-neutral-white p-3 text-sm leading-relaxed text-harbor-black">
        {{ description || 'Sin descripcion.' }}<template v-if="descriptionTruncated">…</template>
      </p>
      <p v-if="descriptionTruncated && detailLoading" class="mt-1 text-xs text-harbor-black/40">
        Cargando la descripcion completa...
      </p>
    </section>

    <section>
      <h5 class="mb-2 text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">Reportante e inmueble</h5>
      <dl class="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Reportante</dt>
          <dd class="font-semibold text-harbor-black">{{ r.reporterName || '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Documento</dt>
          <dd class="font-mono font-semibold text-harbor-black">{{ detail?.reporterDocument || '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Telefono</dt>
          <dd class="font-mono font-semibold text-harbor-black">{{ r.reporterPhone || '—' }}</dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs font-semibold text-harbor-black/50">Correo</dt>
          <dd class="font-semibold text-harbor-black break-all">{{ detail?.reporterEmail || '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Tipo de cliente</dt>
          <dd class="font-semibold text-harbor-black">{{ humanize(r.clientType) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Contrato</dt>
          <dd class="flex items-center gap-1 font-semibold text-harbor-black">
            <span class="font-mono">{{ r.contractNumber || '—' }}</span>
            <template v-if="r.contractNumber">
              <span v-if="r.contractVerified" class="inline-flex items-center gap-0.5 text-xs text-emerald-700">
                <CheckCircle2 class="h-3.5 w-3.5" /> verificado
              </span>
              <span v-else class="text-xs text-amber-700">· sin verificar</span>
            </template>
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Inmueble</dt>
          <dd class="font-semibold text-harbor-black">{{ locationLabel(r) || '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Direccion</dt>
          <dd class="font-semibold text-harbor-black break-words">{{ r.propertyAddress || '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Ingreso al inmueble</dt>
          <dd class="font-semibold" :class="entryLabel.cls || 'text-harbor-black'">{{ entryLabel.text }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">¿Ocurre ahora?</dt>
          <dd class="font-semibold" :class="r.isHappeningNow ? 'text-harbor-error' : 'text-harbor-black'">
            {{ r.isHappeningNow ? 'Si' : 'No' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">A cargo de</dt>
          <dd class="font-semibold text-harbor-black">{{ humanize(r.responsibleParty) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Antiguedad</dt>
          <dd class="font-semibold tabular-nums" :class="sla ? SLA_TEXT[sla] : 'text-harbor-black'">
            {{ formatAge(ageHours(r, now)) }}
            <span v-if="sla" class="text-xs font-medium">
              de {{ slaHours(r) }} h<template v-if="sla === 'late'"> · vencida</template>
            </span>
          </dd>
        </div>
        <div v-if="r.closedAt">
          <dt class="text-xs font-semibold text-harbor-black/50">{{ r.status === 'cancelada' ? 'Cancelada' : 'Cerrada' }}</dt>
          <dd class="font-semibold text-harbor-black">{{ formatDate(r.closedAt) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Ultima actualizacion</dt>
          <dd class="font-semibold text-harbor-black">{{ formatDate(r.updatedAt) }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="availability">
      <h5 class="mb-2 text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">Disponibilidad para la visita</h5>
      <dl class="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Dias</dt>
          <dd class="font-semibold text-harbor-black">{{ availability.days || '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Franja</dt>
          <dd class="font-semibold text-harbor-black">{{ availability.timeSlot || '—' }}</dd>
        </div>
        <div v-if="availability.notes" class="col-span-2">
          <dt class="text-xs font-semibold text-harbor-black/50">Indicaciones</dt>
          <dd class="whitespace-pre-line font-semibold text-harbor-black">{{ availability.notes }}</dd>
        </div>
      </dl>
    </section>

    <section>
      <h5 class="mb-2 text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">
        Adjuntos<template v-if="r.attachmentCount"> ({{ r.attachmentCount }})</template>
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

    <section v-if="detail">
      <h5 class="mb-2 text-[11px] font-bold uppercase tracking-wide text-harbor-black/40">Consentimiento y origen</h5>
      <dl class="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Tratamiento de datos</dt>
          <dd class="font-semibold" :class="detail.consentAccepted ? 'text-emerald-700' : 'text-harbor-error'">
            {{ detail.consentAccepted ? 'Aceptado' : 'No aceptado' }}
            <span v-if="detail.consentPolicyVersion" class="text-xs font-medium text-harbor-black/50">
              · politica {{ detail.consentPolicyVersion }}
            </span>
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-harbor-black/50">Aceptado el</dt>
          <dd class="font-semibold text-harbor-black">{{ formatDate(detail.consentAcceptedAt) }}</dd>
        </div>
      </dl>

      <details class="mt-3 rounded-lg border border-harbor-gray/60 text-sm">
        <summary class="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-harbor-black/60">
          Evidencia tecnica y datos originales del formulario
        </summary>
        <div class="space-y-2 border-t border-harbor-gray/60 px-3 py-2.5 text-xs">
          <p><span class="font-semibold text-harbor-black/50">IP:</span> <span class="font-mono">{{ detail.consentIp || '—' }}</span></p>
          <p class="break-all"><span class="font-semibold text-harbor-black/50">Navegador:</span> {{ detail.consentUserAgent || '—' }}</p>
          <p v-if="detail.submissionId"><span class="font-semibold text-harbor-black/50">Envio:</span> <span class="font-mono">{{ detail.submissionId }}</span></p>
          <pre
            v-if="rawPayloadText"
            class="max-h-72 overflow-auto rounded-md bg-harbor-neutral-white p-2 font-mono text-[11px] leading-snug text-harbor-black/80"
          >{{ rawPayloadText }}</pre>
        </div>
      </details>
    </section>

    <MaintenanceAttachmentsModal
      v-model:open="viewerOpen"
      :request="request"
      :initial-id="viewerInitialId"
    />
  </div>
</template>
