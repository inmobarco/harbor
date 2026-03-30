<script setup lang="ts">
import { Calendar, Clock, User, Phone, FileText, Tag } from 'lucide-vue-next'
import { Badge } from '~/components/ui/badge'
import { appointmentTypeLabels } from '~/types/appointment'

const { selectedAppointment, getAdvisorById } = useAgenda()

const advisor = computed(() => {
  if (!selectedAppointment.value) return null
  return getAdvisorById(selectedAppointment.value.advisorId)
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendiente', class: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmada', class: 'bg-emerald-100 text-emerald-800' },
}
</script>

<template>
  <div>
    <!-- Estado vacio -->
    <div
      v-if="!selectedAppointment"
      class="flex flex-col items-center justify-center py-10 text-center"
    >
      <Calendar class="w-10 h-10 text-harbor-gray mb-3" />
      <p class="text-sm text-harbor-black/40">
        Selecciona una cita del calendario para ver sus detalles
      </p>
    </div>

    <!-- Detalles de la cita -->
    <div v-else class="space-y-4">
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-base font-bold text-harbor-black leading-tight">
          {{ selectedAppointment.title }}
        </h3>
        <Badge
          v-if="statusConfig[selectedAppointment.status]"
          :class="statusConfig[selectedAppointment.status].class"
          class="shrink-0 text-xs font-semibold"
        >
          {{ statusConfig[selectedAppointment.status].label }}
        </Badge>
      </div>

      <!-- Asesor -->
      <div v-if="advisor" class="flex items-center gap-2">
        <span
          class="w-2.5 h-2.5 rounded-full shrink-0"
          :style="{ backgroundColor: advisor.color }"
        />
        <span class="text-sm text-harbor-black/70">{{ advisor.name }}</span>
      </div>

      <!-- Fecha y hora -->
      <div class="flex items-center gap-2 text-sm text-harbor-black/70">
        <Calendar class="w-4 h-4 shrink-0" />
        <span>{{ formatDate(selectedAppointment.date) }}</span>
      </div>
      <div class="flex items-center gap-2 text-sm text-harbor-black/70">
        <Clock class="w-4 h-4 shrink-0" />
        <span>{{ formatTime(selectedAppointment.date) }} · {{ formatDuration(selectedAppointment.duration) }}</span>
      </div>

      <!-- Tipo -->
      <div class="flex items-center gap-2 text-sm text-harbor-black/70">
        <Tag class="w-4 h-4 shrink-0" />
        <span>{{ appointmentTypeLabels[selectedAppointment.type] }}</span>
      </div>

      <!-- Descripcion -->
      <div v-if="selectedAppointment.description" class="flex items-start gap-2 text-sm text-harbor-black/70">
        <FileText class="w-4 h-4 shrink-0 mt-0.5" />
        <span>{{ selectedAppointment.description }}</span>
      </div>

      <!-- Cliente -->
      <div v-if="selectedAppointment.clientName || selectedAppointment.clientPhone" class="border-t border-harbor-gray pt-3 space-y-2">
        <div v-if="selectedAppointment.clientName" class="flex items-center gap-2 text-sm text-harbor-black/70">
          <User class="w-4 h-4 shrink-0" />
          <span>{{ selectedAppointment.clientName }}</span>
        </div>
        <div v-if="selectedAppointment.clientPhone" class="flex items-center gap-2 text-sm text-harbor-black/70">
          <Phone class="w-4 h-4 shrink-0" />
          <span>{{ selectedAppointment.clientPhone }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
