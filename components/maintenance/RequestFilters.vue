<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Search, X } from 'lucide-vue-next'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { MAINTENANCE_PRIORITIES } from '~/types/maintenance'
import type { AssigneeFilter, MaintenancePriority } from '~/types/maintenance'

const { filters, setFilters, resetFilters, myUserId, activeAssignees } = useMaintenance()

const search = ref(filters.value.q)
const applySearch = useDebounceFn((q: string) => setFilters({ q }), 300)
watch(search, q => applySearch(q))
// Si otro control limpia los filtros, vaciar tambien la caja de busqueda
watch(() => filters.value.q, q => { if (q !== search.value.trim()) search.value = q })

function togglePriority(p: MaintenancePriority) {
  const current = filters.value.priority
  setFilters({ priority: current.includes(p) ? current.filter(x => x !== p) : [...current, p] })
}

function toggleAssignee(value: AssigneeFilter) {
  setFilters({ assignee: filters.value.assignee === value ? null : value })
}

/** "Mias" ya cubre al usuario actual: no repetirlo con su nombre. */
const otherAssignees = computed(() => activeAssignees.value.filter(a => a.id !== myUserId.value))

const hasFilters = computed(() =>
  !!filters.value.q || filters.value.priority.length > 0
  || filters.value.assignee !== null || filters.value.quick !== null
)

function clear() {
  search.value = ''
  resetFilters()
}

function chipClass(on: boolean) {
  return on
    ? 'bg-harbor-black border-harbor-black text-white'
    : 'bg-harbor-pure-white border-harbor-gray text-harbor-black/70 hover:border-harbor-black/40'
}

function firstName(name: string) {
  return name.split(' ')[0]
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-5 gap-y-3 bg-harbor-pure-white border border-harbor-gray rounded-xl px-4 py-3">
    <div class="relative w-80">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-harbor-black/40" />
      <Input v-model="search" placeholder="Radicado, nombre, conjunto, contrato..." class="pl-9" />
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs font-semibold text-harbor-black/50 mr-1">Prioridad</span>
      <button
        v-for="p in MAINTENANCE_PRIORITIES"
        :key="p.value"
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
        :class="chipClass(filters.priority.includes(p.value))"
        @click="togglePriority(p.value)"
      >
        {{ p.label }}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs font-semibold text-harbor-black/50 mr-1">Responsable</span>
      <button
        v-if="myUserId !== null"
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
        :class="chipClass(filters.assignee === myUserId)"
        @click="toggleAssignee(myUserId)"
      >
        Mias
      </button>
      <button
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
        :class="chipClass(filters.assignee === 'none')"
        @click="toggleAssignee('none')"
      >
        Sin asignar
      </button>
      <button
        v-for="a in otherAssignees"
        :key="a.id"
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
        :class="chipClass(filters.assignee === a.id)"
        :title="a.name"
        @click="toggleAssignee(a.id)"
      >
        {{ firstName(a.name) }}
      </button>
    </div>

    <Button v-if="hasFilters" variant="ghost" size="sm" class="ml-auto" @click="clear">
      <X class="h-4 w-4" />
      Limpiar filtros
    </Button>
  </div>
</template>
