<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '~/components/ui/dialog'
import { MAINTENANCE_STATUSES, statusLabel } from '~/types/maintenance'
import type { MaintenanceRequest, MaintenanceRequestDetail, MaintenanceStatus } from '~/types/maintenance'

const props = defineProps<{
  request: MaintenanceRequest | null
  /** Estado propuesto al abrir. */
  preset: MaintenanceStatus | null
  /** Estados entre los que se puede elegir. Si no viene: todos menos el actual. */
  options?: MaintenanceStatus[] | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [request: MaintenanceRequestDetail] }>()

const { updateRequest } = useMaintenance()

const target = ref<MaintenanceStatus | null>(null)
const note = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

const choices = computed(() => {
  const list = props.options?.length
    ? props.options
    : MAINTENANCE_STATUSES.map(s => s.value as MaintenanceStatus)
  return list.filter(s => s !== props.request?.status)
})

const isCancel = computed(() => target.value === 'cancelada')
const isFinal = computed(() => target.value === 'cerrada' || target.value === 'cancelada')

watch(open, (isOpen) => {
  if (!isOpen) return
  target.value = props.preset && choices.value.includes(props.preset) ? props.preset : choices.value[0] ?? null
  note.value = ''
  error.value = null
})

async function confirm() {
  if (!props.request || !target.value || saving.value) return
  const trimmed = note.value.trim()
  // El backend tambien lo exige; validar aqui evita un viaje y da un mensaje claro
  if (isCancel.value && !trimmed) {
    error.value = 'Indica el motivo de la cancelacion.'
    return
  }

  saving.value = true
  error.value = null
  try {
    const updated = await updateRequest(props.request.id, {
      status: target.value,
      ...(trimmed ? { note: trimmed } : {}),
    })
    emit('saved', updated)
    open.value = false
  } catch (err: any) {
    error.value = err?.message || 'No se pudo cambiar el estado'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[460px]">
      <DialogHeader>
        <DialogTitle class="text-lg font-bold text-harbor-black">
          {{ isCancel ? 'Cancelar solicitud' : 'Cambiar estado' }}
        </DialogTitle>
        <DialogDescription v-if="request" class="text-sm text-harbor-black/60">
          <span class="font-mono">{{ request.ticket }}</span> · {{ request.categoryLabel }}.
          Estado actual: {{ statusLabel(request.status) }}.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="confirm">
        <div v-if="choices.length > 1" class="space-y-1.5">
          <Label class="text-sm font-semibold text-harbor-black">Nuevo estado</Label>
          <Select v-model="target">
            <SelectTrigger>
              <SelectValue placeholder="Elegir estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in choices" :key="s" :value="s">{{ statusLabel(s) }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p v-else-if="target" class="text-sm text-harbor-black">
          Pasara a <MaintenanceStatusPill :status="target" />
        </p>

        <div class="space-y-1.5">
          <Label class="text-sm font-semibold text-harbor-black">
            {{ isCancel ? 'Motivo de la cancelacion *' : 'Nota para la bitacora (opcional)' }}
          </Label>
          <Textarea
            v-model="note"
            :placeholder="isCancel ? 'Ej.: Duplicada de MNT-000048.' : 'Ej.: El tecnico confirma visita, el arrendatario autoriza ingreso.'"
            class="min-h-[80px]"
          />
        </div>

        <p v-if="isFinal" class="rounded-lg bg-harbor-warning/15 px-3 py-2 text-xs font-semibold text-amber-700">
          {{ statusLabel(target!) }} es un estado final: despues no se podra cambiar el estado.
        </p>

        <p v-if="error" class="text-sm text-harbor-error">{{ error }}</p>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="saving" @click="open = false">Volver</Button>
          <Button type="submit" :variant="isCancel ? 'destructive' : 'default'" :disabled="saving || !target">
            {{ saving ? 'Guardando...' : isCancel ? 'Cancelar solicitud' : 'Confirmar cambio' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
