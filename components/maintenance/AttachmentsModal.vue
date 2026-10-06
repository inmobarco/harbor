<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import {
  Download, ExternalLink, File as FileIcon, FileText, Film, Image as ImageIcon, Music, RefreshCw,
} from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '~/components/ui/dialog'
import { ATTACHMENT_PHASES, phaseLabel, previewKind } from '~/types/maintenance'
import type { MaintenanceAttachment, MaintenanceRequest } from '~/types/maintenance'

const props = defineProps<{ request: MaintenanceRequest | null }>()
const open = defineModel<boolean>('open', { default: false })

const { fetchAttachments } = useMaintenance()

const attachments = ref<MaintenanceAttachment[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const selectedId = ref<number | null>(null)
/** Archivos cuya vista previa fallo (formato raro, archivo aun subiendo...). */
const brokenIds = ref(new Set<number>())

// Renovar con este margen: un enlace que vence a mitad de la descarga falla
const REFRESH_MARGIN_MS = 60_000

const selected = computed(() =>
  attachments.value.find(a => a.id === selectedId.value) ?? null
)

const groups = computed(() => {
  const known = ATTACHMENT_PHASES.map(p => ({
    phase: p.value as string,
    label: p.label as string,
    items: attachments.value.filter(a => a.phase === p.value),
  }))
  // Fases que el front no conoce: se muestran igual, al final
  const knownValues = ATTACHMENT_PHASES.map(p => p.value as string)
  const other = attachments.value.filter(a => !knownValues.includes(a.phase))
  if (other.length) known.push({ phase: 'otros', label: 'Otros', items: other })
  return known.filter(g => g.items.length)
})

const selectedKind = computed(() => {
  if (!selected.value || brokenIds.value.has(selected.value.id)) return null
  return previewKind(selected.value.contentType)
})

async function load() {
  if (!props.request) return
  loading.value = true
  error.value = null
  try {
    attachments.value = await fetchAttachments(props.request.id)
    brokenIds.value = new Set()
    // Conserva la seleccion al renovar las URL; si no, abre el primero
    if (!attachments.value.some(a => a.id === selectedId.value)) {
      selectedId.value = attachments.value[0]?.id ?? null
    }
  } catch (err: any) {
    error.value = err?.message || 'Error al cargar los adjuntos'
  } finally {
    loading.value = false
  }
}

function isExpiring(): boolean {
  const expiresAt = attachments.value[0]?.urlExpiresAt
  if (!expiresAt) return false
  return Date.parse(expiresAt) - Date.now() < REFRESH_MARGIN_MS
}

watch(open, (isOpen) => {
  if (isOpen) {
    attachments.value = []
    selectedId.value = null
    load()
  }
})

// Las URL firmadas duran 15 min: se renuevan solas mientras el modal este abierto
useIntervalFn(() => {
  if (open.value && !loading.value && isExpiring()) load()
}, 30_000)

/** Antes de usar un enlace, se asegura de que siga vigente (p. ej. tras suspender el equipo). */
async function freshAttachment(a: MaintenanceAttachment): Promise<MaintenanceAttachment | null> {
  if (!isExpiring()) return a
  await load()
  return attachments.value.find(x => x.id === a.id) ?? null
}

async function download(a: MaintenanceAttachment) {
  const fresh = await freshAttachment(a)
  // download_url trae Content-Disposition: attachment, el navegador no sale de Harbor
  if (fresh) window.location.href = fresh.downloadUrl
}

async function openInNewTab(a: MaintenanceAttachment) {
  const fresh = await freshAttachment(a)
  if (fresh) window.open(fresh.url, '_blank', 'noopener')
}

function markBroken(id: number) {
  brokenIds.value = new Set(brokenIds.value).add(id)
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

function formatBytes(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function displayName(a: MaintenanceAttachment): string {
  return a.originalName || `Archivo ${a.position}`
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-6xl h-[85vh] flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle class="text-lg font-bold text-harbor-black">
          Adjuntos · <span class="font-mono">{{ request?.ticket }}</span>
        </DialogTitle>
        <DialogDescription class="text-sm text-harbor-black/60">
          {{ request?.categoryLabel }}<template v-if="request?.propertyAddress"> · {{ request.propertyAddress }}</template>
        </DialogDescription>
      </DialogHeader>

      <p v-if="loading && !attachments.length" class="text-sm text-harbor-black/50">Cargando adjuntos...</p>
      <div v-else-if="error" class="flex items-center gap-3">
        <p class="text-sm text-harbor-error">{{ error }}</p>
        <Button variant="outline" size="sm" @click="load">Reintentar</Button>
      </div>
      <p v-else-if="!attachments.length" class="text-sm text-harbor-black/50">
        Esta solicitud no tiene archivos.
      </p>

      <div v-else class="grid grid-cols-[280px_1fr] gap-4 flex-1 min-h-0">
        <!-- Lista por fase -->
        <div class="overflow-y-auto pr-1 space-y-4">
          <div v-for="group in groups" :key="group.phase">
            <h3 class="text-xs font-semibold text-harbor-black/60 uppercase tracking-wider mb-2">
              {{ group.label }} ({{ group.items.length }})
            </h3>
            <div class="space-y-1">
              <button
                v-for="a in group.items"
                :key="a.id"
                type="button"
                class="w-full flex items-center gap-3 rounded-lg p-2 text-left transition-colors"
                :class="a.id === selectedId ? 'bg-harbor-blue/10 ring-1 ring-harbor-blue' : 'hover:bg-harbor-neutral-white'"
                @click="selectedId = a.id"
              >
                <div class="h-12 w-12 shrink-0 rounded-md bg-harbor-surface-gray overflow-hidden grid place-items-center">
                  <img
                    v-if="previewKind(a.contentType) === 'image' && !brokenIds.has(a.id)"
                    :src="a.url"
                    :alt="displayName(a)"
                    loading="lazy"
                    class="h-full w-full object-cover"
                    @error="markBroken(a.id)"
                  />
                  <component :is="iconFor(a)" v-else class="h-5 w-5 text-harbor-black/40" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-harbor-black truncate">{{ displayName(a) }}</p>
                  <p class="text-xs text-harbor-black/50">
                    {{ formatBytes(a.sizeBytes) }}<template v-if="!previewKind(a.contentType)"> · solo descarga</template>
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Vista previa -->
        <div v-if="selected" class="flex flex-col min-h-0 border border-harbor-gray rounded-xl overflow-hidden">
          <div class="flex items-center justify-between gap-3 px-4 py-2 border-b border-harbor-gray bg-harbor-neutral-white">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-harbor-black truncate">{{ displayName(selected) }}</p>
              <p class="text-xs text-harbor-black/50">
                {{ phaseLabel(selected.phase) }} · {{ selected.contentType || 'tipo desconocido' }}
                <template v-if="selected.sizeBytes !== null"> · {{ formatBytes(selected.sizeBytes) }}</template>
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <RefreshCw v-if="loading" class="h-4 w-4 animate-spin text-harbor-black/40" />
              <Button v-if="selectedKind" variant="outline" size="sm" @click="openInNewTab(selected)">
                <ExternalLink class="h-4 w-4" />
                Abrir
              </Button>
              <Button size="sm" @click="download(selected)">
                <Download class="h-4 w-4" />
                Descargar
              </Button>
            </div>
          </div>

          <div class="flex-1 min-h-0 grid place-items-center bg-harbor-black/5 p-2 overflow-auto">
            <img
              v-if="selectedKind === 'image'"
              :key="selected.url"
              :src="selected.url"
              :alt="displayName(selected)"
              class="max-h-full max-w-full object-contain"
              @error="markBroken(selected.id)"
            />
            <video
              v-else-if="selectedKind === 'video'"
              :key="selected.url"
              :src="selected.url"
              controls
              class="max-h-full max-w-full"
              @error="markBroken(selected.id)"
            />
            <audio
              v-else-if="selectedKind === 'audio'"
              :key="selected.url"
              :src="selected.url"
              controls
              @error="markBroken(selected.id)"
            />
            <iframe
              v-else-if="selectedKind === 'pdf'"
              :key="selected.url"
              :src="selected.url"
              :title="displayName(selected)"
              class="h-full w-full bg-white"
            />
            <div v-else class="text-center px-6">
              <FileIcon class="h-10 w-10 mx-auto text-harbor-black/30 mb-3" />
              <p class="text-sm font-semibold text-harbor-black">No se puede ver en el navegador</p>
              <p class="text-sm text-harbor-black/50 mt-1">
                <template v-if="brokenIds.has(selected.id)">
                  No se pudo cargar la vista previa{{ selected.storageStatus ? ` (estado: ${selected.storageStatus})` : '' }}.
                </template>
                <template v-else>Este formato solo se puede descargar.</template>
              </p>
              <Button class="mt-4" size="sm" @click="download(selected)">
                <Download class="h-4 w-4" />
                Descargar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
