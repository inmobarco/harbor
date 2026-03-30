<script setup lang="ts">
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '~/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '~/components/ui/select'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import { Button } from '~/components/ui/button'
import { appointmentTypeLabels, appointmentDurationLabels } from '~/types/appointment'
import type { AppointmentType, AppointmentDuration, CreateAppointmentPayload } from '~/types/appointment'

const open = defineModel<boolean>('open', { default: false })

const { advisors, createAppointment } = useAgenda()

// Form state
const form = reactive({
  advisorId: '',
  title: '',
  description: '',
  date: '',
  time: '',
  duration: '60' as string,
  clientName: '',
  clientPhone: '',
  type: 'visit' as string,
})

const errors = reactive<Record<string, string>>({})
const showConfirmation = ref(false)
const showSuccess = ref(false)

function validate(): boolean {
  // Clear errors
  Object.keys(errors).forEach(k => delete errors[k])

  if (!form.advisorId) errors.advisorId = 'Selecciona un asesor'
  if (!form.title.trim()) errors.title = 'El titulo es requerido'
  if (form.title.length > 100) errors.title = 'Maximo 100 caracteres'
  if (form.description.length > 500) errors.description = 'Maximo 500 caracteres'
  if (!form.date) {
    errors.date = 'Selecciona una fecha'
  }
  if (!form.time) {
    errors.time = 'Selecciona una hora'
  }
  if (form.date && form.time) {
    const dateTime = new Date(`${form.date}T${form.time}`)
    if (dateTime < new Date()) {
      errors.date = 'La fecha y hora no pueden ser en el pasado'
    }
  }
  if (!form.duration) errors.duration = 'Selecciona una duracion'
  if (!form.type) errors.type = 'Selecciona un tipo de cita'
  if (form.clientName.length > 100) errors.clientName = 'Maximo 100 caracteres'

  return Object.keys(errors).length === 0
}

function handleSubmit() {
  if (!validate()) return
  showConfirmation.value = true
}

function handleConfirm() {
  // TODO: Validar que la hora no choque con otra cita existente del mismo asesor

  const payload: CreateAppointmentPayload = {
    advisorId: form.advisorId,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    date: `${form.date}T${form.time}`,
    duration: Number(form.duration) as AppointmentDuration,
    clientName: form.clientName.trim() || undefined,
    clientPhone: form.clientPhone.trim() || undefined,
    type: form.type as AppointmentType,
  }

  createAppointment(payload)
  showConfirmation.value = false
  resetForm()
  open.value = false
  showSuccess.value = true
  setTimeout(() => { showSuccess.value = false }, 3000)
}

function handleCancelConfirmation() {
  showConfirmation.value = false
}

function resetForm() {
  form.advisorId = ''
  form.title = ''
  form.description = ''
  form.date = ''
  form.time = ''
  form.duration = '60'
  form.clientName = ''
  form.clientPhone = ''
  form.type = 'visit'
  Object.keys(errors).forEach(k => delete errors[k])
}

function handleOpenChange(val: boolean) {
  if (!val) {
    showConfirmation.value = false
    resetForm()
  }
  open.value = val
}

const selectedAdvisorName = computed(() => {
  return advisors.value.find(a => a.id === form.advisorId)?.name ?? ''
})

const durationLabel = computed(() => {
  return form.duration ? appointmentDurationLabels[Number(form.duration) as AppointmentDuration] : ''
})

const typeLabel = computed(() => {
  return form.type ? appointmentTypeLabels[form.type as AppointmentType] : ''
})

// Min date for the date input (today)
const minDate = computed(() => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
})

function formatConfirmDateTime(): string {
  if (!form.date || !form.time) return ''
  const d = new Date(`${form.date}T${form.time}`)
  return d.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
</script>

<template>
  <!-- Toast de exito -->
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0 translate-y-[-1rem]"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-[-1rem]"
  >
    <div
      v-if="showSuccess"
      class="fixed top-4 right-4 z-[100] bg-harbor-success text-white px-5 py-3 rounded-lg shadow-lg text-sm font-semibold"
    >
      Cita creada exitosamente
    </div>
  </Transition>

  <!-- Modal principal -->
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
      <!-- Vista: Formulario -->
      <template v-if="!showConfirmation">
        <DialogHeader>
          <DialogTitle class="text-lg font-bold text-harbor-black">Nueva Cita</DialogTitle>
          <DialogDescription class="text-sm text-harbor-black/60">
            Completa los datos para agendar una nueva cita
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <!-- Asesor -->
          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Asesor *</Label>
            <Select v-model="form.advisorId">
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar asesor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="advisor in advisors"
                  :key="advisor.id"
                  :value="advisor.id"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: advisor.color }" />
                    {{ advisor.name }}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.advisorId" class="text-xs text-harbor-error">{{ errors.advisorId }}</p>
          </div>

          <!-- Titulo -->
          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Titulo *</Label>
            <Input
              v-model="form.title"
              placeholder="Titulo de la cita"
              maxlength="100"
            />
            <p v-if="errors.title" class="text-xs text-harbor-error">{{ errors.title }}</p>
          </div>

          <!-- Descripcion -->
          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Descripcion</Label>
            <Textarea
              v-model="form.description"
              placeholder="Descripcion opcional"
              maxlength="500"
              rows="2"
            />
            <p v-if="errors.description" class="text-xs text-harbor-error">{{ errors.description }}</p>
          </div>

          <!-- Fecha y hora -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label class="text-sm font-semibold text-harbor-black">Fecha *</Label>
              <input
                v-model="form.date"
                type="date"
                :min="minDate"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p v-if="errors.date" class="text-xs text-harbor-error">{{ errors.date }}</p>
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm font-semibold text-harbor-black">Hora *</Label>
              <input
                v-model="form.time"
                type="time"
                step="900"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p v-if="errors.time" class="text-xs text-harbor-error">{{ errors.time }}</p>
            </div>
          </div>

          <!-- Duracion y Tipo (2 columnas) -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label class="text-sm font-semibold text-harbor-black">Duracion *</Label>
              <Select v-model="form.duration">
                <SelectTrigger>
                  <SelectValue placeholder="Duracion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1.5 horas</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="errors.duration" class="text-xs text-harbor-error">{{ errors.duration }}</p>
            </div>

            <div class="space-y-1.5">
              <Label class="text-sm font-semibold text-harbor-black">Tipo de cita *</Label>
              <Select v-model="form.type">
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="(label, key) in appointmentTypeLabels"
                    :key="key"
                    :value="key"
                  >
                    {{ label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="errors.type" class="text-xs text-harbor-error">{{ errors.type }}</p>
            </div>
          </div>

          <!-- Datos del cliente -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label class="text-sm font-semibold text-harbor-black">Nombre del cliente</Label>
              <Input
                v-model="form.clientName"
                placeholder="Nombre"
                maxlength="100"
              />
              <p v-if="errors.clientName" class="text-xs text-harbor-error">{{ errors.clientName }}</p>
            </div>

            <div class="space-y-1.5">
              <Label class="text-sm font-semibold text-harbor-black">Telefono del cliente</Label>
              <Input
                v-model="form.clientPhone"
                type="tel"
                placeholder="Telefono"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            @click="handleOpenChange(false)"
          >
            Cancelar
          </Button>
          <Button
            class="bg-harbor-blue hover:bg-harbor-blue-dark text-white"
            @click="handleSubmit"
          >
            Crear Cita
          </Button>
        </DialogFooter>
      </template>

      <!-- Vista: Confirmacion -->
      <template v-else>
        <DialogHeader>
          <DialogTitle class="text-lg font-bold text-harbor-black">Confirmar cita</DialogTitle>
          <DialogDescription class="text-sm text-harbor-black/60">
            Revisa los datos antes de confirmar
          </DialogDescription>
        </DialogHeader>

        <div class="bg-harbor-white rounded-lg border border-harbor-gray p-4 space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-harbor-black/60">Titulo</span>
            <span class="text-sm font-semibold text-harbor-black">{{ form.title }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-harbor-black/60">Asesor</span>
            <span class="text-sm font-semibold text-harbor-black">{{ selectedAdvisorName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-harbor-black/60">Fecha y hora</span>
            <span class="text-sm font-semibold text-harbor-black">{{ formatConfirmDateTime() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-harbor-black/60">Duracion</span>
            <span class="text-sm font-semibold text-harbor-black">{{ durationLabel }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-harbor-black/60">Tipo</span>
            <span class="text-sm font-semibold text-harbor-black">{{ typeLabel }}</span>
          </div>
          <div v-if="form.clientName" class="flex justify-between">
            <span class="text-sm text-harbor-black/60">Cliente</span>
            <span class="text-sm font-semibold text-harbor-black">{{ form.clientName }}</span>
          </div>
          <div v-if="form.clientPhone" class="flex justify-between">
            <span class="text-sm text-harbor-black/60">Telefono</span>
            <span class="text-sm font-semibold text-harbor-black">{{ form.clientPhone }}</span>
          </div>
          <div v-if="form.description" class="pt-2 border-t border-harbor-gray">
            <span class="text-sm text-harbor-black/60">Descripcion</span>
            <p class="text-sm text-harbor-black mt-1">{{ form.description }}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            @click="handleCancelConfirmation"
          >
            Volver
          </Button>
          <Button
            class="bg-harbor-blue hover:bg-harbor-blue-dark text-white"
            @click="handleConfirm"
          >
            Confirmar
          </Button>
        </DialogFooter>
      </template>
    </DialogContent>
  </Dialog>
</template>
