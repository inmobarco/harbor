import { computed } from 'vue'
import { useAgendaStore } from '~/stores/agenda'
import { useAuthStore } from '~/stores/auth'
import type { CreateAppointmentPayload } from '~/types/appointment'
import type { Advisor } from '~/types/advisor'

export interface WeekSummaryRow {
  label: string
  dateRange: string
  advisorSummaries: Array<{
    advisor: Advisor
    pendingCount: number
    confirmedCount: number
  }>
}

function getWeekRange(weekOffset: number) {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - dayOfWeek + weekOffset * 7)
  sunday.setHours(0, 0, 0, 0)
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)
  saturday.setHours(23, 59, 59, 999)
  return { start: sunday, end: saturday }
}

function formatDateRange(start: Date, end: Date): string {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const sDay = start.getDate()
  const sMonth = months[start.getMonth()]
  const eDay = end.getDate()
  const eMonth = months[end.getMonth()]
  if (start.getMonth() === end.getMonth()) {
    return `${sDay} - ${eDay} ${sMonth}`
  }
  return `${sDay} ${sMonth} - ${eDay} ${eMonth}`
}

export function useAgenda() {
  const store = useAgendaStore()

  // Eventos en formato FullCalendar (solo pending/confirmed + asesores visibles)
  const calendarEvents = computed(() => {
    return store.visibleAppointments.map(apt => {
      const advisor = store.getAdvisorById(apt.advisorId)
      const startDate = new Date(apt.date)
      const endDate = new Date(startDate.getTime() + apt.duration * 60000)
      const pad = (n: number) => String(n).padStart(2, '0')
      const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`
      return {
        id: apt.id,
        title: apt.title,
        start: apt.date,
        end: endStr,
        backgroundColor: advisor?.color ?? '#94a3b8',
        borderColor: advisor?.color ?? '#94a3b8',
        textColor: '#ffffff',
        extendedProps: { appointment: apt, advisor },
      }
    })
  })

  // Resumen semanal: semana actual, siguiente, anterior
  const weeklySummary = computed<WeekSummaryRow[]>(() => {
    const weeks = [
      { offset: 0, label: 'Semana actual' },
      { offset: 1, label: 'Proxima semana' },
      { offset: -1, label: 'Semana anterior' },
    ]

    return weeks.map(({ offset, label }) => {
      const { start, end } = getWeekRange(offset)
      const dateRange = formatDateRange(start, end)

      const advisorSummaries = store.advisors
        .filter(a => store.visibleAdvisorIds.has(a.id))
        .map(advisor => {
          const weekAppointments = store.appointments.filter(apt => {
            if (apt.advisorId !== advisor.id) return false
            const aptDate = new Date(apt.date)
            return aptDate >= start && aptDate <= end
          })
          return {
            advisor,
            pendingCount: weekAppointments.filter(a => a.status === 'pending').length,
            confirmedCount: weekAppointments.filter(a => a.status === 'confirmed').length,
          }
        })

      return { label, dateRange, advisorSummaries }
    })
  })

  // Crear cita
  async function createAppointment(payload: CreateAppointmentPayload) {
    const config = useRuntimeConfig()
    const authStore = useAuthStore()

    const createdBy = authStore.user
      ? `${authStore.user.first_name} ${authStore.user.last_name}`
      : ''

    // Enviar POST a webhook de n8n
    await $fetch(config.public.n8nWebhookCreateAppointment, {
      method: 'POST',
      body: { ...payload, createdBy },
    })

    // Agregar al estado local
    store.addAppointment(payload)
  }

  return {
    // State
    advisors: computed(() => store.advisors),
    advisorsLoading: computed(() => store.advisorsLoading),
    advisorsError: computed(() => store.advisorsError),
    appointments: computed(() => store.appointments),
    appointmentsLoading: computed(() => store.appointmentsLoading),
    appointmentsError: computed(() => store.appointmentsError),
    selectedAppointment: computed(() => store.selectedAppointment),
    visibleAdvisorIds: computed(() => store.visibleAdvisorIds),
    // Derived
    calendarEvents,
    weeklySummary,
    // Actions
    fetchAdvisors: store.fetchAdvisors,
    fetchAppointments: store.fetchAppointments,
    selectAppointment: store.selectAppointment,
    toggleAdvisorVisibility: store.toggleAdvisorVisibility,
    createAppointment,
    getAdvisorById: store.getAdvisorById,
  }
}
