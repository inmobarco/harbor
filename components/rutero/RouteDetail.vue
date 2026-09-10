<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Pencil, Trash2, UserPlus } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { DAYS_OF_WEEK } from '~/types/route'
import type { RouteAssignment, RouteDetail } from '~/types/route'
import type { Advisor } from '~/types/advisor'

const props = defineProps<{
  route: RouteDetail
  assignments: RouteAssignment[]
  loading?: boolean
  deletingAssignmentId?: number | null
}>()

const emit = defineEmits<{
  edit: []
  remove: []
  assign: []
  unassign: [assignmentId: number]
}>()

const { getAdvisorById } = useRoutes()

/** Agrupadas por dia para leer la semana de un vistazo. */
const byDay = computed(() =>
  DAYS_OF_WEEK
    .map(day => ({
      day: day.value,
      label: day.label,
      items: props.assignments
        .filter(a => a.dayOfWeek === day.value)
        .sort((a, b) => a.priority - b.priority),
    }))
    .filter(group => group.items.length > 0)
)

const inactiveComplexes = computed(() => props.route.complexes.filter(c => !c.isActive))

/**
 * Sin conjuntos activos la ruta desaparece de la agenda del asesor:
 * _get_advisor_routes hace INNER JOIN contra residential_complexes activos.
 */
const isInvisibleToAdvisors = computed(() =>
  props.route.complexes.length > 0 && props.route.complexCount === 0
)

/**
 * assignmentCount lo cuenta el backend sobre route_assignment. Las filas salen
 * del abanico por asesor, que oculta las rutas sin conjuntos activos y solo
 * cubre los asesores cargados. La diferencia se declara en vez de esconderse.
 */
const unresolvedCount = computed(() =>
  Math.max(0, props.route.assignmentCount - props.assignments.length)
)

function advisorOf(assignment: RouteAssignment): Advisor | undefined {
  return getAdvisorById(assignment.advisorId)
}

</script>

<template>
  <div class="flex flex-col h-full bg-harbor-pure-white border border-harbor-gray rounded-xl overflow-hidden">
    <!-- Header -->
    <div class="p-5 border-b border-harbor-gray flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h2 class="text-xl font-bold text-harbor-black truncate">{{ route.name }}</h2>
        <p class="text-sm text-harbor-black/50 mt-1">
          {{ route.complexCount }} conjunto{{ route.complexCount === 1 ? '' : 's' }} activo{{ route.complexCount === 1 ? '' : 's' }}
          <span v-if="inactiveComplexes.length" class="text-harbor-warning">
            (+{{ inactiveComplexes.length }} inactivo{{ inactiveComplexes.length === 1 ? '' : 's' }})
          </span>
          · {{ route.assignmentCount }} asignacion{{ route.assignmentCount === 1 ? '' : 'es' }}
        </p>
        <p v-if="route.notes" class="text-sm text-harbor-black/70 mt-2 whitespace-pre-line">
          {{ route.notes }}
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" @click="emit('edit')">
          <Pencil class="h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="text-harbor-error hover:text-harbor-error"
          @click="emit('remove')"
        >
          <Trash2 class="h-4 w-4" />
          Eliminar
        </Button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-5 space-y-6">
      <!-- Una ruta sin conjuntos activos no le llega a ningun asesor -->
      <div
        v-if="isInvisibleToAdvisors"
        class="rounded-lg bg-harbor-error/10 border border-harbor-error/30 px-4 py-3 flex gap-2"
      >
        <AlertTriangle class="h-4 w-4 text-harbor-error shrink-0 mt-0.5" />
        <p class="text-sm text-harbor-black/80">
          <span class="font-semibold">Ruta sin conjuntos activos.</span>
          No aparece en la agenda de ningun asesor, aunque tenga asignaciones.
          Editala para agregar conjuntos activos.
        </p>
      </div>

      <!-- Conjuntos en orden de visita -->
      <section>
        <h3 class="text-xs font-bold text-harbor-black/60 uppercase tracking-wide mb-3">
          Orden de visita
        </h3>
        <p v-if="loading" class="text-sm text-harbor-black/50">Cargando conjuntos...</p>
        <p v-else-if="!route.complexes.length" class="text-sm text-harbor-black/50">
          Esta ruta no tiene conjuntos. Editala para agregarlos.
        </p>
        <ol v-else class="border border-harbor-gray rounded-lg divide-y divide-harbor-gray/60">
          <li
            v-for="(complex, index) in route.complexes"
            :key="complex.complexId"
            class="px-4 py-2.5 flex items-center gap-3"
          >
            <span
              class="w-6 h-6 shrink-0 rounded-full text-xs font-mono font-bold
                     flex items-center justify-center"
              :class="complex.isActive
                ? 'bg-harbor-blue/15 text-harbor-blue-dark'
                : 'bg-harbor-black/10 text-harbor-black/40'"
            >
              {{ index + 1 }}
            </span>
            <div class="min-w-0 flex-1">
              <p
                class="text-sm truncate"
                :class="complex.isActive ? 'text-harbor-black' : 'text-harbor-black/40 line-through'"
              >
                {{ complex.name }}
              </p>
              <p v-if="complex.address" class="text-xs text-harbor-black/45 truncate">
                {{ complex.address }}
              </p>
            </div>
            <span
              v-if="!complex.isActive"
              class="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5
                     rounded-full bg-harbor-warning/15 text-amber-700"
              title="Conjunto desactivado en inventario: el asesor ya no lo recibe en su ruta"
            >
              Inactivo
            </span>
          </li>
        </ol>
      </section>

      <!-- Asignaciones -->
      <section>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-bold text-harbor-black/60 uppercase tracking-wide">
            Asignaciones
          </h3>
          <Button variant="outline" size="sm" @click="emit('assign')">
            <UserPlus class="h-4 w-4" />
            Asignar a asesor
          </Button>
        </div>

        <p v-if="unresolvedCount > 0" class="text-xs text-amber-700 mb-2">
          El backend reporta {{ unresolvedCount }} asignacion(es) mas de las que se ven aqui.
          {{ isInvisibleToAdvisors
            ? 'La ruta no tiene conjuntos activos, asi que no aparece en la agenda de sus asesores.'
            : 'Pertenecen a usuarios fuera de la lista de asesores cargada.' }}
        </p>

        <p v-if="!byDay.length" class="text-sm text-harbor-black/50">
          Sin asesores asignados a esta ruta.
        </p>

        <div v-else class="space-y-3">
          <div v-for="group in byDay" :key="group.day">
            <p class="text-xs font-semibold text-harbor-black/50 mb-1.5">{{ group.label }}</p>
            <div class="border border-harbor-gray rounded-lg divide-y divide-harbor-gray/60">
              <div
                v-for="assignment in group.items"
                :key="assignment.id"
                class="px-4 py-2.5 flex items-center gap-3"
              >
                <span
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  :style="{ backgroundColor: advisorOf(assignment)?.color ?? '#94a3b8' }"
                />
                <span class="text-sm text-harbor-black flex-1 truncate">
                  {{ advisorOf(assignment)?.name ?? `Asesor ${assignment.advisorId}` }}
                </span>
                <span
                  v-if="group.items.length > 1"
                  class="text-xs font-mono text-harbor-black/45 shrink-0"
                  :title="`Orden dentro del ${group.label.toLowerCase()}`"
                >
                  #{{ assignment.priority }}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="text-harbor-error hover:text-harbor-error shrink-0"
                  :disabled="deletingAssignmentId === assignment.id"
                  :aria-label="`Quitar asignacion de ${advisorOf(assignment)?.name ?? assignment.advisorId}`"
                  @click="emit('unassign', assignment.id)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
