<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'
import type { PropertyFilters, WasiZone } from '~/types/property'

const emit = defineEmits<{
  search: [filters: PropertyFilters, referenceSearch: string]
  clear: []
}>()

const CITIES = [
  { id: '291', name: 'Envigado' },
  { id: '496', name: 'Medellín' },
  { id: '698', name: 'Sabaneta' },
  { id: '416', name: 'La Estrella' },
  { id: '389', name: 'Itagüí' },
  { id: '89', name: 'Bello' },
]

const match = ref('')
const id_property = ref<number | undefined>()
const min_bedrooms = ref<number | undefined>()
const bathrooms = ref<number | undefined>()
const garages = ref<number | undefined>()
const max_price = ref<number | undefined>()
const min_area = ref<number | undefined>()
const id_city = ref('')
const id_zone = ref<number | undefined>()

const zones = ref<WasiZone[]>([])
const loadingZones = ref(false)

const { fetchZones } = useWasi()

watch(id_city, async (cityId) => {
  id_zone.value = undefined
  zones.value = []
  if (!cityId) return

  loadingZones.value = true
  try {
    zones.value = await fetchZones(cityId)
  } finally {
    loadingZones.value = false
  }
})

function handleSearch() {
  const filters: PropertyFilters = {}
  if (id_property.value) filters.id_property = id_property.value
  if (min_bedrooms.value) filters.min_bedrooms = min_bedrooms.value
  if (bathrooms.value) filters.bathrooms = bathrooms.value
  if (garages.value) filters.garages = garages.value
  if (max_price.value) filters.max_price = max_price.value
  if (min_area.value) filters.min_area = min_area.value
  if (id_city.value) filters.id_city = id_city.value
  if (id_zone.value) filters.id_zone = id_zone.value
  emit('search', filters, match.value.trim())
}

function handleClear() {
  match.value = ''
  id_property.value = undefined
  min_bedrooms.value = undefined
  bathrooms.value = undefined
  garages.value = undefined
  max_price.value = undefined
  min_area.value = undefined
  id_city.value = ''
  id_zone.value = undefined
  zones.value = []
  emit('clear')
}

const inputClass = 'w-full border border-harbor-gray rounded-lg px-3 py-2 text-sm text-harbor-black focus:outline-none focus:border-harbor-blue transition-colors'
const labelClass = 'block text-xs font-semibold text-harbor-black/50 uppercase tracking-wide mb-1'
</script>

<template>
  <div class="bg-white rounded-xl border border-harbor-gray p-6 space-y-4">
    <!-- Fila 1: Referencia + ID -->
    <div class="grid grid-cols-[1fr_180px] gap-4">
      <div>
        <label :class="labelClass">Referencia</label>
        <input
          v-model="match"
          type="text"
          placeholder="Buscar por referencia..."
          :class="inputClass"
          @keyup.enter="handleSearch"
        />
      </div>
      <div>
        <label :class="labelClass">ID Propiedad</label>
        <input
          v-model.number="id_property"
          type="number"
          placeholder="ID"
          :class="inputClass"
          @keyup.enter="handleSearch"
        />
      </div>
    </div>

    <!-- Fila 2: Numéricos -->
    <div class="grid grid-cols-5 gap-4">
      <div>
        <label :class="labelClass">Habitaciones mín</label>
        <input v-model.number="min_bedrooms" type="number" min="0" placeholder="0" :class="inputClass" />
      </div>
      <div>
        <label :class="labelClass">Baños mín</label>
        <input v-model.number="bathrooms" type="number" min="0" placeholder="0" :class="inputClass" />
      </div>
      <div>
        <label :class="labelClass">Garajes mín</label>
        <input v-model.number="garages" type="number" min="0" placeholder="0" :class="inputClass" />
      </div>
      <div>
        <label :class="labelClass">Precio máx</label>
        <input v-model.number="max_price" type="number" min="0" placeholder="Sin límite" :class="inputClass" />
      </div>
      <div>
        <label :class="labelClass">Área mín (m²)</label>
        <input v-model.number="min_area" type="number" min="0" placeholder="0" :class="inputClass" />
      </div>
    </div>

    <!-- Fila 3: Ciudad + Zona -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label :class="labelClass">Ciudad</label>
        <select v-model="id_city" :class="inputClass">
          <option value="">— Sin seleccionar —</option>
          <option v-for="city in CITIES" :key="city.id" :value="city.id">
            {{ city.name }}
          </option>
        </select>
      </div>
      <div>
        <label :class="labelClass">Barrio / Zona</label>
        <select v-model.number="id_zone" :class="inputClass" :disabled="!id_city || loadingZones">
          <option :value="undefined">
            {{ loadingZones ? 'Cargando zonas...' : '— Sin seleccionar —' }}
          </option>
          <option v-for="zone in zones" :key="zone.id_zone" :value="zone.id_zone">
            {{ zone.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Fila 4: Botones -->
    <div class="flex items-center gap-3 pt-2">
      <button
        @click="handleSearch"
        class="flex items-center gap-2 bg-harbor-blue text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-harbor-blue-dark transition-colors"
      >
        <Search class="w-4 h-4" />
        Buscar
      </button>
      <button
        @click="handleClear"
        class="flex items-center gap-2 border border-harbor-gray text-harbor-black/70 font-semibold text-sm px-5 py-2.5 rounded-lg hover:border-harbor-blue hover:text-harbor-blue-dark transition-colors"
      >
        <X class="w-4 h-4" />
        Limpiar filtros
      </button>
    </div>
  </div>
</template>
