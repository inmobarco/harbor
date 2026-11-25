<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RefreshCw, Route as RouteIcon } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '~/components/ui/dialog'
import type { RouteDetail as RouteDetailType } from '~/types/route'

definePageMeta({ layout: 'default' })

const {
  routes, routesLoading, routesError,
  selectedRoute, selectedRouteId, detailLoading,
  selectedRouteAssignments, assignmentsLoading, assignmentsError,
  loadAll, fetchAssignments, selectRoute, deleteRoute, deleteAssignment,
} = useRoutes()

const formOpen = ref(false)
const editingRoute = ref<RouteDetailType | null>(null)
const assignOpen = ref(false)

const confirmDeleteOpen = ref(false)
const deletingRoute = ref(false)
const deleteError = ref<string | null>(null)
const deletingAssignmentId = ref<number | null>(null)

const refreshing = ref(false)

onMounted(async () => {
  await loadAll()
  // Abre la primera ruta para no dejar el panel vacio al entrar
  if (!selectedRouteId.value && routes.value.length) {
    await selectRoute(routes.value[0].id)
  }
})

async function refresh() {
  refreshing.value = true
  try {
    await loadAll()
    if (selectedRouteId.value) await selectRoute(selectedRouteId.value)
  } finally {
    refreshing.value = false
  }
}

function openCreate() {
  editingRoute.value = null
  formOpen.value = true
}

function openEdit() {
  editingRoute.value = selectedRoute.value
  formOpen.value = true
}

async function handleSaved(routeId: number) {
  await selectRoute(routeId)
}

async function handleAssigned() {
  // Recarga el abanico: la asignacion nueva ya esta en el store, pero asi se
  // recogen tambien los ids que solo devuelve el GET
  await fetchAssignments()
}

async function confirmDelete() {
  if (!selectedRouteId.value || deletingRoute.value) return
  deletingRoute.value = true
  deleteError.value = null
  try {
    await deleteRoute(selectedRouteId.value)
    confirmDeleteOpen.value = false
    if (routes.value.length) await selectRoute(routes.value[0].id)
  } catch (err: any) {
    console.error('Error eliminando la ruta:', err)
    deleteError.value = err?.data?.detail || err?.data?.message || 'No se pudo eliminar la ruta'
  } finally {
    deletingRoute.value = false
  }
}

async function handleUnassign(assignmentId: number) {
  if (deletingAssignmentId.value) return
  deletingAssignmentId.value = assignmentId
  try {
    await deleteAssignment(assignmentId)
  } catch (err) {
    console.error('Error quitando la asignacion:', err)
  } finally {
    deletingAssignmentId.value = null
  }
}

const loadingAnything = computed(() => routesLoading.value || assignmentsLoading.value)
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-7rem)]">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-harbor-black">Rutero</h1>
        <p class="text-sm text-harbor-black/50 mt-0.5">
          Plantillas de recorrido y su asignacion semanal por asesor.
        </p>
      </div>
      <Button variant="outline" size="sm" :disabled="refreshing || loadingAnything" @click="refresh">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': refreshing }" />
        Actualizar
      </Button>
    </div>

    <p v-if="assignmentsError" class="mb-3 text-sm text-harbor-warning">{{ assignmentsError }}</p>

    <!-- Master-detail -->
    <div class="grid grid-cols-[320px_1fr] gap-5 flex-1 min-h-0">
      <RuteroRouteList
        :routes="routes"
        :selected-id="selectedRouteId"
        :loading="routesLoading"
        :error="routesError"
        @select="selectRoute"
        @create="openCreate"
      />

      <RuteroRouteDetail
        v-if="selectedRoute"
        :route="selectedRoute"
        :assignments="selectedRouteAssignments"
        :loading="detailLoading"
        :deleting-assignment-id="deletingAssignmentId"
        @edit="openEdit"
        @remove="confirmDeleteOpen = true"
        @assign="assignOpen = true"
        @unassign="handleUnassign"
      />

      <div
        v-else
        class="flex flex-col items-center justify-center bg-harbor-pure-white border border-harbor-gray
               rounded-xl text-center px-8"
      >
        <RouteIcon class="h-10 w-10 text-harbor-black/20 mb-3" />
        <p class="text-sm font-semibold text-harbor-black">
          {{ routes.length ? 'Selecciona una ruta' : 'Aun no hay rutas' }}
        </p>
        <p class="text-sm text-harbor-black/50 mt-1">
          {{ routes.length
            ? 'Elige una ruta de la izquierda para ver su recorrido y sus asesores.'
            : 'Crea la primera ruta para empezar a organizar la prospeccion.' }}
        </p>
        <Button v-if="!routes.length" class="mt-4" @click="openCreate">Crear ruta</Button>
      </div>
    </div>

    <!-- Modales -->
    <RuteroRouteFormModal v-model:open="formOpen" :route="editingRoute" @saved="handleSaved" />

    <RuteroAssignRouteModal
      v-if="selectedRoute"
      v-model:open="assignOpen"
      :route="selectedRoute"
      @assigned="handleAssigned"
    />

    <Dialog v-model:open="confirmDeleteOpen">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle class="text-lg font-bold text-harbor-black">Eliminar ruta</DialogTitle>
          <DialogDescription class="text-sm text-harbor-black/60">
            Se desactivara "{{ selectedRoute?.name }}" y todas sus asignaciones a asesores.
            La composicion de conjuntos se conserva.
          </DialogDescription>
        </DialogHeader>
        <p v-if="deleteError" class="text-sm text-harbor-error">{{ deleteError }}</p>
        <DialogFooter>
          <Button variant="outline" :disabled="deletingRoute" @click="confirmDeleteOpen = false">
            Cancelar
          </Button>
          <Button variant="destructive" :disabled="deletingRoute" @click="confirmDelete">
            {{ deletingRoute ? 'Eliminando...' : 'Eliminar' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
