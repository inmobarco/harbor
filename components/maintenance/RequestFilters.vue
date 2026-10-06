<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Search, X } from 'lucide-vue-next'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { MAINTENANCE_PRIORITIES, MAINTENANCE_STATUSES } from '~/types/maintenance'
import type { MaintenancePriority, MaintenanceStatus } from '~/types/maintenance'

// radix Select no admite value vacio: 'all' representa "sin filtro"
const ALL = 'all'

const { filters, setFilters, resetFilters } = useMaintenance()

const search = ref(filters.value.q)
const applySearch = useDebounceFn((q: string) => setFilters({ q }), 350)
watch(search, q => applySearch(q))

const statusValue = computed(() => filters.value.status[0] ?? ALL)
const priorityValue = computed(() => filters.value.priority[0] ?? ALL)

function onStatus(value: any) {
  setFilters({ status: value === ALL ? [] : [value as MaintenanceStatus] })
}

function onPriority(value: any) {
  setFilters({ priority: value === ALL ? [] : [value as MaintenancePriority] })
}

const hasFilters = computed(() =>
  !!filters.value.q || filters.value.status.length > 0 || filters.value.priority.length > 0
  || filters.value.needsReview || filters.value.unassigned
)

function clear() {
  search.value = ''
  resetFilters()
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 bg-harbor-pure-white border border-harbor-gray rounded-xl p-4">
    <div class="relative w-80">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-harbor-black/40" />
      <Input v-model="search" placeholder="Radicado, nombre, direccion o contrato..." class="pl-9" />
    </div>

    <div class="w-52">
      <Select :model-value="statusValue" @update:model-value="onStatus">
        <SelectTrigger>
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Todos los estados</SelectItem>
          <SelectItem v-for="s in MAINTENANCE_STATUSES" :key="s.value" :value="s.value">
            {{ s.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="w-44">
      <Select :model-value="priorityValue" @update:model-value="onPriority">
        <SelectTrigger>
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Todas las prioridades</SelectItem>
          <SelectItem v-for="p in MAINTENANCE_PRIORITIES" :key="p.value" :value="p.value">
            {{ p.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <label class="flex items-center gap-2 text-sm text-harbor-black cursor-pointer">
      <Checkbox
        :model-value="filters.needsReview"
        @update:model-value="v => setFilters({ needsReview: v === true })"
      />
      Requiere revision
    </label>

    <label class="flex items-center gap-2 text-sm text-harbor-black cursor-pointer">
      <Checkbox
        :model-value="filters.unassigned"
        @update:model-value="v => setFilters({ unassigned: v === true })"
      />
      Sin responsable
    </label>

    <Button v-if="hasFilters" variant="ghost" size="sm" class="ml-auto" @click="clear">
      <X class="h-4 w-4" />
      Limpiar filtros
    </Button>
  </div>
</template>
