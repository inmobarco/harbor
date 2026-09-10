<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import type { RouteDetail } from '~/types/route'

const props = defineProps<{
  /** null = crear una ruta nueva; con valor = editar esa ruta. */
  route: RouteDetail | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ saved: [routeId: number] }>()

const { complexes, complexesLoading, createRoute, updateRoute } = useRoutes()

const isEdit = computed(() => props.route !== null)

const form = ref({ name: '', notes: '' })
const selectedIds = ref<number[]>([])
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const submitError = ref<string | null>(null)

/** Snapshot para no mandar complex_ids si la composicion no cambio. */
const originalIds = ref<number[]>([])

watch(open, isOpen => {
  if (!isOpen) return
  errors.value = {}
  submitError.value = null

  if (props.route) {
    form.value = { name: props.route.name, notes: props.route.notes ?? '' }
    originalIds.value = props.route.complexes.map(c => c.complexId)
    selectedIds.value = [...originalIds.value]
  } else {
    form.value = { name: '', notes: '' }
    originalIds.value = []
    selectedIds.value = []
  }
})

/**
 * Conjuntos de la ruta que ya no estan activos en inventario. El picker los
 * necesita para poder mostrar su nombre en vez de un id suelto.
 */
const inactiveInRoute = computed(() =>
  (props.route?.complexes ?? [])
    .filter(c => !c.isActive)
    .map(c => ({ id: c.complexId, name: c.name, address: c.address }))
)

/** Cuantos inactivos siguen en la seleccion actual. */
const selectedInactiveCount = computed(() => {
  const inactiveIds = new Set(inactiveInRoute.value.map(c => c.id))
  return selectedIds.value.filter(id => inactiveIds.has(id)).length
})

function dropInactive() {
  const inactiveIds = new Set(inactiveInRoute.value.map(c => c.id))
  selectedIds.value = selectedIds.value.filter(id => !inactiveIds.has(id))
}

const complexesChanged = computed(() => {
  if (selectedIds.value.length !== originalIds.value.length) return true
  return selectedIds.value.some((id, i) => id !== originalIds.value[i])
})

function validate(): boolean {
  const next: Record<string, string> = {}
  if (!form.value.name.trim()) next.name = 'El nombre es requerido'
  else if (form.value.name.trim().length > 100) next.name = 'Maximo 100 caracteres'
  if (form.value.notes.length > 500) next.notes = 'Maximo 500 caracteres'
  if (!selectedIds.value.length) next.complexes = 'Agrega al menos un conjunto a la ruta'
  errors.value = next
  return Object.keys(next).length === 0
}

async function handleSubmit() {
  if (!validate() || saving.value) return

  saving.value = true
  submitError.value = null
  try {
    const name = form.value.name.trim()
    const notes = form.value.notes.trim() || null

    if (props.route) {
      const detail = await updateRoute(props.route.id, {
        name,
        notes,
        ...(complexesChanged.value ? { complexIds: selectedIds.value } : {}),
      })
      emit('saved', detail.id)
    } else {
      const detail = await createRoute({ name, notes, complexIds: selectedIds.value })
      emit('saved', detail.id)
    }
    open.value = false
  } catch (err: any) {
    console.error('Error guardando la ruta:', err)
    submitError.value = err?.data?.detail || err?.data?.message || 'No se pudo guardar la ruta'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="text-lg font-bold text-harbor-black">
          {{ isEdit ? 'Editar ruta' : 'Nueva ruta' }}
        </DialogTitle>
        <DialogDescription class="text-sm text-harbor-black/60">
          El orden de los conjuntos define el recorrido de prospeccion.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Nombre *</Label>
            <Input v-model="form.name" placeholder="Ej: Ruta Norte" maxlength="100" />
            <p v-if="errors.name" class="text-xs text-harbor-error">{{ errors.name }}</p>
          </div>
          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Notas</Label>
            <Textarea v-model="form.notes" placeholder="Notas opcionales" maxlength="500" rows="1" />
            <p v-if="errors.notes" class="text-xs text-harbor-error">{{ errors.notes }}</p>
          </div>
        </div>

        <div class="space-y-1.5">
          <Label class="text-sm font-semibold text-harbor-black">Conjuntos de la ruta *</Label>
          <RuteroComplexPicker
            v-model="selectedIds"
            :complexes="complexes"
            :extra="inactiveInRoute"
            :loading="complexesLoading"
          />
          <p v-if="errors.complexes" class="text-xs text-harbor-error">{{ errors.complexes }}</p>
        </div>

        <div
          v-if="selectedInactiveCount > 0"
          class="rounded-lg bg-harbor-warning/10 border border-harbor-warning/30 px-3 py-2
                 flex items-center justify-between gap-3"
        >
          <p class="text-xs text-harbor-black/70">
            <span class="font-semibold">{{ selectedInactiveCount }} conjunto(s) inactivo(s)</span>
            en la ruta: el asesor no los recibe y la API puede rechazar el guardado.
          </p>
          <Button variant="outline" size="sm" class="shrink-0" @click="dropInactive">
            Quitarlos
          </Button>
        </div>

        <div
          v-if="isEdit && complexesChanged"
          class="rounded-lg bg-harbor-warning/10 border border-harbor-warning/30 px-3 py-2"
        >
          <p class="text-xs text-harbor-black/70">
            <span class="font-semibold">Ojo:</span> al guardar se reemplaza la composicion completa
            de la ruta con la lista de arriba.
          </p>
        </div>

        <p v-if="submitError" class="text-sm text-harbor-error">{{ submitError }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
        <Button :disabled="saving" @click="handleSubmit">
          {{ saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear ruta') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
