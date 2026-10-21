<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronRight, Layers } from 'lucide-vue-next'
import type { MaintenanceRequest } from '~/types/maintenance'

/**
 * Aviso informativo: la persona reporto varias fallas en el mismo envio. Cada
 * solicitud se gestiona por separado; esto solo ayuda a coordinar una visita.
 */
const props = defineProps<{ request: MaintenanceRequest }>()
const emit = defineEmits<{ select: [requestId: number] }>()

const { fetchSubmission, submissions } = useMaintenance()

const error = ref<string | null>(null)

// Una respuesta lenta de otro envio no debe pintarse en este
let seq = 0

async function load() {
  const submissionId = props.request.submissionId
  error.value = null
  if (!submissionId) return
  const current = ++seq
  try {
    await fetchSubmission(submissionId)
  } catch (err: any) {
    if (current === seq) error.value = err?.message || 'Error al cargar el envio'
  }
}

// Se vuelve a pedir al abrir cada solicitud: otra persona pudo cambiar las demas
watch(() => props.request.id, load, { immediate: true })

const group = computed(() => {
  const id = props.request.submissionId
  if (!id) return []
  return [...(submissions.value[id] ?? [])].sort((a, b) => (a.issueIndex ?? 0) - (b.issueIndex ?? 0))
})

const others = computed(() => group.value.filter(r => r.id !== props.request.id))
</script>

<template>
  <section
    v-if="others.length"
    class="rounded-lg border border-harbor-blue/40 bg-harbor-blue/5 px-3 py-2.5"
    aria-label="Solicitudes del mismo envio"
  >
    <div class="flex items-start gap-2">
      <Layers class="mt-0.5 h-4 w-4 shrink-0 text-harbor-blue-dark" />
      <div class="min-w-0">
        <p class="text-sm font-bold text-harbor-black">
          Reportada junto con {{ others.length }} solicitud{{ others.length === 1 ? '' : 'es' }} mas
        </p>
        <p class="text-xs text-harbor-black/60">
          <template v-if="request.issueIndex">Falla {{ request.issueIndex }} de {{ group.length }} del mismo envio. </template>
          Cada una se gestiona por separado; considera coordinar una sola visita.
        </p>
      </div>
    </div>

    <ul class="mt-2 flex flex-col gap-1">
      <li v-for="r in others" :key="r.id">
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md bg-harbor-pure-white px-2.5 py-1.5 text-left transition-colors hover:bg-harbor-blue/10"
          @click="emit('select', r.id)"
        >
          <span v-if="r.issueIndex" class="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-harbor-black/40">
            {{ r.issueIndex }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-harbor-black">
              {{ r.categoryLabel }}<span v-if="r.subcategoryLabel" class="font-medium text-harbor-black/60"> · {{ r.subcategoryLabel }}</span>
            </span>
            <span class="block font-mono text-[11px] text-harbor-black/50">{{ r.ticket }}</span>
          </span>
          <MaintenanceStatusPill :status="r.status" />
          <MaintenanceAssigneeAvatar :user-id="r.assignedUserId" :name="r.assignedUserName" />
          <ChevronRight class="h-4 w-4 shrink-0 text-harbor-black/30" />
        </button>
      </li>
    </ul>
  </section>

  <p v-else-if="error" class="text-xs text-harbor-black/40">
    No se pudo verificar si hay otras solicitudes del mismo envio.
  </p>
</template>
