<script setup lang="ts">
import { Link, ExternalLink, FileSpreadsheet } from 'lucide-vue-next'
import type { Property } from '~/types/property'

const props = defineProps<{
  property: Property
}>()

const { encrypt } = useEncryption()
const config = useRuntimeConfig()

const displayRef = computed(() =>
  props.property.reference || props.property.registration_number || '—'
)

const propertyUrl = computed(() => {
  const encryptedId = encrypt(props.property.id_property)
  if (!encryptedId) return null
  return `${config.public.cardUrl}?id=${encryptedId}`
})

const copied = ref(false)

async function copyLink() {
  if (!propertyUrl.value) return
  await navigator.clipboard.writeText(propertyUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function openCard() {
  if (!propertyUrl.value) return
  window.open(propertyUrl.value, '_blank')
}

const prices = computed(() => {
  const list: { label: string; price: string }[] = []
  if (String(props.property.for_sale) === 'true') {
    list.push({ label: 'Venta', price: props.property.sale_price_label || 'Sin precio' })
  }
  if (String(props.property.for_rent) === 'true') {
    list.push({ label: 'Arriendo', price: props.property.rent_price_label || 'Sin precio' })
  }
  return list
})

const hasCuartoUtil = computed(() =>
  !!props.property.tv_share && String(props.property.tv_share) !== '0'
)
</script>

<template>
  <div class="bg-white rounded-xl border border-harbor-gray p-5 flex items-start justify-between gap-6">
    <!-- Info -->
    <div class="flex-1 min-w-0 space-y-1.5">
      <!-- Referencia + ID -->
      <div class="flex items-center gap-3">
        <span class="font-mono text-base font-bold text-harbor-black">{{ displayRef }}</span>
        <span class="text-sm text-harbor-black/50">ID: {{ property.id_property }}</span>
      </div>

      <!-- Precio -->
      <div class="flex items-center gap-4">
        <template v-if="prices.length">
          <div v-for="p in prices" :key="p.label" class="flex items-center gap-2">
            <span class="text-lg font-bold text-harbor-blue-dark">{{ p.price }}</span>
            <span class="bg-harbor-blue/10 text-harbor-blue-dark text-xs px-2 py-0.5 rounded-full font-medium">
              {{ p.label }}
            </span>
          </div>
        </template>
        <span v-else class="text-sm text-harbor-black/40">Sin precio</span>
      </div>

      <!-- Ubicación -->
      <p class="text-sm text-harbor-black/70">
        {{ property.city_label }}<template v-if="property.zone_label"> - {{ property.zone_label }}</template>
      </p>

      <!-- Detalles -->
      <div class="flex items-center gap-3 text-sm text-harbor-black/60 flex-wrap">
        <span>{{ property.bedrooms }} Hab</span>
        <span class="text-harbor-gray">|</span>
        <span>{{ property.bathrooms }} Baños</span>
        <span class="text-harbor-gray">|</span>
        <span>{{ property.area }} m²</span>
        <span class="text-harbor-gray">|</span>
        <span>{{ property.garages }} Garajes</span>
        <template v-if="hasCuartoUtil">
          <span class="text-harbor-gray">|</span>
          <span class="text-harbor-blue-dark font-medium">Cuarto útil</span>
        </template>
      </div>
    </div>

    <!-- Botones -->
    <div class="flex flex-col gap-2 shrink-0">
      <button
        @click="copyLink"
        :disabled="!propertyUrl"
        class="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors border disabled:opacity-40 disabled:cursor-not-allowed"
        :class="copied
          ? 'bg-green-500 text-white border-green-500'
          : 'text-harbor-blue-dark border-harbor-blue/30 hover:bg-harbor-blue-dark hover:text-white hover:border-harbor-blue'"
      >
        <Link class="w-4 h-4" />
        {{ copied ? 'Copiado' : 'Copiar enlace' }}
      </button>
      <button
        @click="openCard"
        :disabled="!propertyUrl"
        class="flex items-center gap-1.5 text-sm font-semibold text-harbor-blue-dark border border-harbor-blue/30 rounded-lg px-3 py-1.5 transition-colors hover:bg-harbor-blue-dark hover:text-white hover:border-harbor-blue disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ExternalLink class="w-4 h-4" />
        Abrir ficha
      </button>
      <button class="flex items-center gap-1.5 text-sm font-semibold text-harbor-blue-dark border border-harbor-blue/30 rounded-lg px-3 py-1.5 transition-colors hover:bg-harbor-blue-dark hover:text-white hover:border-harbor-blue">
        <FileSpreadsheet class="w-4 h-4" />
        Agregar a excel
      </button>
    </div>
  </div>
</template>
