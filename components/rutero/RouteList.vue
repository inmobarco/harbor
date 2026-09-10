<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle, Plus, Search } from 'lucide-vue-next'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import type { RouteSummary } from '~/types/route'

const props = defineProps<{
  routes: RouteSummary[]
  selectedId: number | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{ select: [routeId: number]; create: [] }>()

const search = ref('')

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return props.routes
  return props.routes.filter(r => r.name.toLowerCase().includes(term))
})
</script>

<template>
  <div class="flex flex-col h-full bg-harbor-pure-white border border-harbor-gray rounded-xl overflow-hidden">
    <div class="p-4 border-b border-harbor-gray space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-bold text-harbor-black uppercase tracking-wide">Rutas</h2>
        <Button size="sm" @click="emit('create')">
          <Plus class="h-4 w-4" />
          Nueva
        </Button>
      </div>
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-harbor-black/40" />
        <Input v-model="search" placeholder="Buscar ruta..." class="pl-9" />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <p v-if="loading && !routes.length" class="px-4 py-6 text-sm text-harbor-black/50">
        Cargando rutas...
      </p>
      <p v-else-if="error" class="px-4 py-6 text-sm text-harbor-error">{{ error }}</p>
      <p v-else-if="!filtered.length" class="px-4 py-6 text-sm text-harbor-black/50">
        {{ search ? 'Sin resultados' : 'Aun no hay rutas creadas.' }}
      </p>

      <button
        v-for="route in filtered"
        :key="route.id"
        type="button"
        class="w-full text-left px-4 py-3 border-b border-harbor-gray/50 transition-colors"
        :class="route.id === selectedId
          ? 'bg-harbor-blue/10 border-l-4 border-l-harbor-blue pl-3'
          : 'hover:bg-harbor-neutral-white border-l-4 border-l-transparent pl-3'"
        @click="emit('select', route.id)"
      >
        <div class="flex items-center gap-1.5">
          <AlertTriangle
            v-if="route.complexCount === 0"
            class="h-3.5 w-3.5 shrink-0 text-harbor-error"
          />
          <p
            class="text-sm font-semibold truncate"
            :class="route.id === selectedId ? 'text-harbor-blue-dark' : 'text-harbor-black'"
          >
            {{ route.name }}
          </p>
        </div>
        <p
          class="text-xs mt-0.5"
          :class="route.complexCount === 0 ? 'text-harbor-error' : 'text-harbor-black/50'"
        >
          {{ route.complexCount }} conjunto{{ route.complexCount === 1 ? '' : 's' }} activo{{ route.complexCount === 1 ? '' : 's' }} ·
          {{ route.assignmentCount }} asignacion{{ route.assignmentCount === 1 ? '' : 'es' }}
        </p>
      </button>
    </div>
  </div>
</template>
