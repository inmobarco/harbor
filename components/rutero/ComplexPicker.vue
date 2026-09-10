<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowUp, Plus, Search, X } from 'lucide-vue-next'
import { Input } from '~/components/ui/input'
import type { ResidentialComplex } from '~/types/route'

const props = defineProps<{
  /** Pool seleccionable: solo conjuntos activos de inventario. */
  complexes: ResidentialComplex[]
  /**
   * Conjuntos que ya estan en la ruta pero salieron de inventario. Sirven para
   * mostrar su nombre en la columna de orden; no se pueden volver a agregar.
   */
  extra?: ResidentialComplex[]
  loading?: boolean
}>()

/** IDs seleccionados en orden de visita: el indice define visit_order. */
const selectedIds = defineModel<number[]>({ default: () => [] })

const search = ref('')

const byId = computed(() => {
  const map = new Map<number, ResidentialComplex>()
  for (const c of props.complexes) map.set(c.id, c)
  for (const c of props.extra ?? []) map.set(c.id, c)
  return map
})

/** Todo lo seleccionado que no este en el pool activo esta inactivo. */
const activeIds = computed(() => new Set(props.complexes.map(c => c.id)))

const selected = computed(() =>
  selectedIds.value.map(id => byId.value.get(id) ?? { id, name: `Conjunto ${id}`, address: null })
)

const available = computed(() => {
  const term = search.value.trim().toLowerCase()
  const chosen = new Set(selectedIds.value)
  return props.complexes
    .filter(c => !chosen.has(c.id))
    .filter(c => !term || c.name.toLowerCase().includes(term))
    .slice(0, 50)
})

function add(id: number) {
  if (selectedIds.value.includes(id)) return
  selectedIds.value = [...selectedIds.value, id]
}

function remove(id: number) {
  selectedIds.value = selectedIds.value.filter(x => x !== id)
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= selectedIds.value.length) return
  const next = [...selectedIds.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  selectedIds.value = next
}
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <!-- Disponibles -->
    <div class="flex flex-col min-h-0">
      <p class="text-xs font-semibold text-harbor-black/60 uppercase tracking-wide mb-2">
        Conjuntos disponibles
      </p>
      <div class="relative mb-2">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-harbor-black/40" />
        <Input v-model="search" placeholder="Buscar conjunto..." class="pl-9" />
      </div>
      <div class="border border-harbor-gray rounded-lg h-64 overflow-y-auto divide-y divide-harbor-gray/60">
        <p v-if="loading" class="px-3 py-4 text-sm text-harbor-black/50">Cargando conjuntos...</p>
        <p v-else-if="!available.length" class="px-3 py-4 text-sm text-harbor-black/50">
          {{ search ? 'Sin resultados' : 'No hay conjuntos disponibles' }}
        </p>
        <button
          v-for="complex in available"
          :key="complex.id"
          type="button"
          class="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-harbor-blue/10 transition-colors group"
          @click="add(complex.id)"
        >
          <Plus class="h-4 w-4 shrink-0 text-harbor-black/30 group-hover:text-harbor-blue-dark" />
          <span class="text-sm text-harbor-black truncate">{{ complex.name }}</span>
        </button>
      </div>
    </div>

    <!-- Seleccionados en orden -->
    <div class="flex flex-col min-h-0">
      <p class="text-xs font-semibold text-harbor-black/60 uppercase tracking-wide mb-2">
        Orden de visita ({{ selected.length }})
      </p>
      <div class="h-10 mb-2 flex items-center">
        <p class="text-xs text-harbor-black/50">Usa las flechas para reordenar el recorrido.</p>
      </div>
      <div class="border border-harbor-gray rounded-lg h-64 overflow-y-auto divide-y divide-harbor-gray/60">
        <p v-if="!selected.length" class="px-3 py-4 text-sm text-harbor-black/50">
          Agrega conjuntos desde la lista de la izquierda.
        </p>
        <div
          v-for="(complex, index) in selected"
          :key="complex.id"
          class="px-3 py-2 flex items-center gap-2"
        >
          <span class="w-6 shrink-0 text-xs font-mono font-semibold text-harbor-blue-dark">
            {{ index + 1 }}
          </span>
          <span
            class="text-sm truncate flex-1"
            :class="activeIds.has(complex.id) ? 'text-harbor-black' : 'text-harbor-black/45 line-through'"
          >
            {{ complex.name }}
          </span>
          <span
            v-if="!activeIds.has(complex.id)"
            class="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5
                   rounded-full bg-harbor-warning/15 text-amber-700"
            title="Inactivo en inventario: el asesor no lo recibe y puede que la API rechace guardarlo"
          >
            Inactivo
          </span>
          <button
            type="button"
            class="p-1 rounded hover:bg-harbor-surface-gray disabled:opacity-25 disabled:hover:bg-transparent"
            :disabled="index === 0"
            :aria-label="`Subir ${complex.name}`"
            @click="move(index, -1)"
          >
            <ArrowUp class="h-3.5 w-3.5 text-harbor-black/60" />
          </button>
          <button
            type="button"
            class="p-1 rounded hover:bg-harbor-surface-gray disabled:opacity-25 disabled:hover:bg-transparent"
            :disabled="index === selected.length - 1"
            :aria-label="`Bajar ${complex.name}`"
            @click="move(index, 1)"
          >
            <ArrowDown class="h-3.5 w-3.5 text-harbor-black/60" />
          </button>
          <button
            type="button"
            class="p-1 rounded hover:bg-harbor-error/10"
            :aria-label="`Quitar ${complex.name}`"
            @click="remove(complex.id)"
          >
            <X class="h-3.5 w-3.5 text-harbor-error" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
