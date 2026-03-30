import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Appointment, AppointmentApiResponse, AppointmentDuration, CreateAppointmentPayload } from '~/types/appointment'
import type { Advisor, AdvisorApiResponse } from '~/types/advisor'
import { ADVISOR_COLORS } from '~/types/advisor'
import { useAuthStore } from '~/stores/auth'

export const useAgendaStore = defineStore('agenda', () => {
  // State
  const advisors = ref<Advisor[]>([])
  const advisorsLoading = ref(false)
  const advisorsError = ref<string | null>(null)
  const appointments = ref<Appointment[]>([])
  const appointmentsLoading = ref(false)
  const appointmentsError = ref<string | null>(null)
  const selectedAppointmentId = ref<string | null>(null)
  const visibleAdvisorIds = ref<Set<string>>(new Set())

  // Computed
  const selectedAppointment = computed(() => {
    if (!selectedAppointmentId.value) return null
    return appointments.value.find(a => a.id === selectedAppointmentId.value) ?? null
  })

  const visibleAppointments = computed(() => {
    return appointments.value.filter(
      a => visibleAdvisorIds.value.has(a.advisorId)
        && (a.status === 'pending' || a.status === 'confirmed')
    )
  })

  // Actions
  async function fetchAdvisors() {
    const config = useRuntimeConfig()
    const authStore = useAuthStore()

    if (!authStore.token) {
      advisorsError.value = 'No hay sesion activa'
      return
    }

    advisorsLoading.value = true
    advisorsError.value = null

    try {
      const data = await $fetch<AdvisorApiResponse[]>(
        `${config.public.apiBaseUrl}/staff/users`,
        {
          params: { roles: 'sales_agent,listing_agent,admin' },
          headers: { Authorization: `Bearer ${authStore.token}` },
        }
      )

      advisors.value = data.map((user, index) => ({
        id: String(user.id),
        name: `${user.first_name} ${user.last_name}`,
        color: ADVISOR_COLORS[index % ADVISOR_COLORS.length],
      }))

      // Hacer visibles todos los asesores al cargar
      visibleAdvisorIds.value = new Set(advisors.value.map(a => a.id))
    } catch (err: any) {
      console.error('Error cargando asesores:', err)
      advisorsError.value = err?.data?.message || 'Error al cargar asesores'
    } finally {
      advisorsLoading.value = false
    }
  }

  async function fetchAppointments() {
    const config = useRuntimeConfig()
    const authStore = useAuthStore()

    if (!authStore.token) {
      appointmentsError.value = 'No hay sesion activa'
      return
    }

    appointmentsLoading.value = true
    appointmentsError.value = null

    // Calcular el 1 del mes anterior
    const now = new Date()
    const prevMonth = now.getMonth() - 1
    const year = prevMonth < 0 ? now.getFullYear() - 1 : now.getFullYear()
    const month = prevMonth < 0 ? 12 : prevMonth + 1
    const after = `${year}-${String(month).padStart(2, '0')}-01`

    try {
      const data = await $fetch<AppointmentApiResponse[]>(
        `${config.public.apiBaseUrl}/staff/appointments`,
        {
          params: {
            after,
            roles: 'sales_agent,listing_agent,admin',
          },
          headers: { Authorization: `Bearer ${authStore.token}` },
        }
      )

      appointments.value = data.map(apt => ({
        id: String(apt.id),
        advisorId: String(apt.user_id),
        title: apt.title,
        description: apt.description ?? undefined,
        date: apt.appointment_date,
        duration: apt.duration_minutes as AppointmentDuration,
        clientName: apt.client_name ?? undefined,
        clientPhone: apt.client_phone ?? undefined,
        type: apt.appointment_type,
        status: apt.status,
        createdAt: apt.created_at,
      }))
    } catch (err: any) {
      console.error('Error cargando citas:', err)
      appointmentsError.value = err?.data?.message || 'Error al cargar citas'
    } finally {
      appointmentsLoading.value = false
    }
  }

  function selectAppointment(id: string | null) {
    selectedAppointmentId.value = id
  }

  function toggleAdvisorVisibility(advisorId: string) {
    const ids = new Set(visibleAdvisorIds.value)
    if (ids.has(advisorId)) {
      ids.delete(advisorId)
    } else {
      ids.add(advisorId)
    }
    visibleAdvisorIds.value = ids
  }

  function addAppointment(payload: CreateAppointmentPayload) {
    const newAppointment: Appointment = {
      ...payload,
      id: `apt-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    appointments.value.push(newAppointment)
  }

  function getAdvisorById(id: string): Advisor | undefined {
    return advisors.value.find(a => a.id === id)
  }

  return {
    // State
    advisors,
    advisorsLoading,
    advisorsError,
    appointments,
    appointmentsLoading,
    appointmentsError,
    selectedAppointmentId,
    visibleAdvisorIds,
    // Computed
    selectedAppointment,
    visibleAppointments,
    // Actions
    fetchAdvisors,
    fetchAppointments,
    selectAppointment,
    toggleAdvisorVisibility,
    addAppointment,
    getAdvisorById,
  }
})
