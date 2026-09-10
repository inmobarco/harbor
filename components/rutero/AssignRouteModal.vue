<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '~/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '~/components/ui/select'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { DAYS_OF_WEEK } from '~/types/route'
import type { RouteDetail } from '~/types/route'

const props = defineProps<{ route: RouteDetail }>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ assigned: [] }>()

const { advisors, assignmentsFor, createAssignment } = useRoutes()

const form = ref({ advisorId: '', dayOfWeek: '' })
const priority = ref(1)
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const submitError = ref<string | null>(null)

watch(open, isOpen => {
  if (!isOpen) return
  form.value = { advisorId: '', dayOfWeek: '' }
  priority.value = 1
  errors.value = {}
  submitError.value = null
})

/** Rutas que el asesor ya tiene ese dia: definen si hay que elegir orden. */
const sameDayAssignments = computed(() => {
  if (!form.value.advisorId || !form.value.dayOfWeek) return []
  return assignmentsFor(form.value.advisorId, Number(form.value.dayOfWeek))
})

const alreadyAssigned = computed(() =>
  sameDayAssignments.value.some(a => a.routeId === props.route.id)
)

/** Solo se pregunta la prioridad cuando compite con otra ruta del mismo dia. */
const showPriority = computed(() => sameDayAssignments.value.length > 0 && !alreadyAssigned.value)

/**
 * No hay endpoint para reordenar asignaciones existentes, asi que la nueva
 * ruta se propone al final (max + 1). Bajar el numero la adelanta.
 */
watch(sameDayAssignments, list => {
  priority.value = list.length ? Math.max(...list.map(a => a.priority)) + 1 : 1
})

function validate(): boolean {
  const next: Record<string, string> = {}
  if (!form.value.advisorId) next.advisorId = 'Selecciona un asesor'
  if (!form.value.dayOfWeek) next.dayOfWeek = 'Selecciona un dia'
  if (alreadyAssigned.value) next.dayOfWeek = 'Esta ruta ya esta asignada a ese asesor ese dia'
  if (showPriority.value && (!Number.isInteger(priority.value) || priority.value < 1)) {
    next.priority = 'Debe ser un entero mayor o igual a 1'
  }
  errors.value = next
  return Object.keys(next).length === 0
}

async function handleSubmit() {
  if (!validate() || saving.value) return

  saving.value = true
  submitError.value = null
  try {
    await createAssignment({
      routeId: props.route.id,
      advisorId: form.value.advisorId,
      dayOfWeek: Number(form.value.dayOfWeek),
      priority: showPriority.value ? priority.value : 1,
    })
    emit('assigned')
    open.value = false
  } catch (err: any) {
    console.error('Error asignando la ruta:', err)
    submitError.value = err?.data?.detail || err?.data?.message || 'No se pudo asignar la ruta'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle class="text-lg font-bold text-harbor-black">Asignar ruta</DialogTitle>
        <DialogDescription class="text-sm text-harbor-black/60">
          {{ route.name }} — se repite cada semana en el dia elegido.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-1.5">
          <Label class="text-sm font-semibold text-harbor-black">Asesor *</Label>
          <Select v-model="form.advisorId">
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar asesor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="advisor in advisors" :key="advisor.id" :value="advisor.id">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: advisor.color }" />
                  {{ advisor.name }}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="errors.advisorId" class="text-xs text-harbor-error">{{ errors.advisorId }}</p>
        </div>

        <div class="space-y-1.5">
          <Label class="text-sm font-semibold text-harbor-black">Dia de la semana *</Label>
          <Select v-model="form.dayOfWeek">
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar dia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="day in DAYS_OF_WEEK" :key="day.value" :value="String(day.value)">
                {{ day.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="errors.dayOfWeek" class="text-xs text-harbor-error">{{ errors.dayOfWeek }}</p>
        </div>

        <div v-if="showPriority" class="space-y-1.5">
          <Label class="text-sm font-semibold text-harbor-black">Orden en el dia</Label>
          <Input v-model.number="priority" type="number" min="1" step="1" />
          <p v-if="errors.priority" class="text-xs text-harbor-error">{{ errors.priority }}</p>
          <div class="rounded-lg bg-harbor-surface-gray/60 px-3 py-2 space-y-0.5">
            <p class="text-xs font-semibold text-harbor-black/70">
              Ya tiene {{ sameDayAssignments.length }} ruta(s) ese dia:
            </p>
            <p
              v-for="a in sameDayAssignments"
              :key="a.routeId"
              class="text-xs text-harbor-black/60"
            >
              <span class="font-mono">{{ a.priority }}</span> — {{ a.routeName || `Ruta ${a.routeId}` }}
            </p>
          </div>
        </div>

        <p v-if="submitError" class="text-sm text-harbor-error">{{ submitError }}</p>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
        <Button :disabled="saving" @click="handleSubmit">
          {{ saving ? 'Asignando...' : 'Asignar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
