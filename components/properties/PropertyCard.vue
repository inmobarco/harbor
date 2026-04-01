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
const addedToExcel = ref(false)
const addingToExcel = ref(false)

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

async function addToExcel() {
  if (addingToExcel.value) return
  addingToExcel.value = true
  try {
    const encryptedId = encrypt(props.property.id_property)
    await $fetch(config.public.n8nWebhookAddRow as string, {
      method: 'POST',
      body: {
        propertyId: props.property.id_property,
        encryptedId: encryptedId || props.property.id_property,
        propertyName: displayRef.value,
        timestamp: new Date().toISOString(),
      },
    })
    addedToExcel.value = true
    setTimeout(() => { addedToExcel.value = false }, 2000)
  } catch (e) {
    console.error('Error al agregar a Excel:', e)
  } finally {
    addingToExcel.value = false
  }
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

const statusTag = computed(() => {
  const s = Number(props.property.id_status_on_page)
  if (s === 1) return { label: 'Activo', bg: 'bg-harbor-success/15', text: 'text-harbor-success' }
  if (s === 2) return { label: 'Inactivo', bg: 'bg-harbor-warning/15', text: 'text-harbor-warning' }
  if (s === 3) return { label: 'Destacado', bg: 'bg-harbor-purple/15', text: 'text-harbor-purple' }
  return null
})

const isInactive = computed(() => Number(props.property.id_status_on_page) === 2)
</script>

<template>
  <div class="bg-white rounded-xl border border-harbor-gray p-5 flex items-start gap-6">
    <!-- Info: 25% -->
    <div class="w-1/4 shrink-0 space-y-1.5">
      <!-- Referencia + ID + Estado -->
      <div class="flex items-start gap-2 flex-wrap">
        <span class="font-mono text-base font-bold text-harbor-black break-all">{{ displayRef }}</span>
        <span class="text-sm text-harbor-black/50 shrink-0">ID: {{ property.id_property }}</span>
        <span
          v-if="statusTag"
          class="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
          :class="[statusTag.bg, statusTag.text]"
        >
          {{ statusTag.label }}
        </span>
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

    <!-- Label + Comentario interno: 35% -->
    <div v-if="property.comment || property.label" class="w-[35%] shrink-0 self-stretch flex flex-col justify-center border-l border-harbor-gray/60 pl-5">
      <span
        v-if="property.label"
        class="text-xs px-2 py-0.5 rounded-full font-semibold bg-harbor-purple/15 text-harbor-purple w-fit mb-1.5"
      >
        {{ property.label }}
      </span>
      <template v-if="property.comment">
        <p class="text-xs text-harbor-black/40 font-medium mb-1 uppercase tracking-wide">Comentario</p>
        <p class="text-sm text-harbor-black/70 leading-snug max-h-20 overflow-y-auto">{{ property.comment }}</p>
      </template>
    </div>

    <!-- Botones -->
    <div class="flex flex-col gap-2 shrink-0 ml-auto">
      <template v-if="!isInactive">
        <button
          @click="copyLink"
          :disabled="!propertyUrl"
          class="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors border disabled:opacity-40 disabled:cursor-not-allowed"
          :class="copied
            ? 'bg-harbor-success text-white border-harbor-success'
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
        <button
          @click="addToExcel"
          :disabled="addingToExcel"
          class="flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors border disabled:opacity-40 disabled:cursor-not-allowed"
          :class="addedToExcel
            ? 'bg-harbor-success text-white border-harbor-success'
            : 'text-harbor-blue-dark border-harbor-blue/30 hover:bg-harbor-blue-dark hover:text-white hover:border-harbor-blue'"
        >
          <FileSpreadsheet class="w-4 h-4" />
          {{ addingToExcel ? 'Enviando...' : addedToExcel ? 'Agregado' : 'Agregar a excel' }}
        </button>
      </template>
      <!-- TODO: Activar propiedad -->
      <!-- <button
        v-else
        class="flex items-center gap-1.5 text-sm font-semibold text-harbor-success border border-harbor-success/30 rounded-lg px-3 py-1.5 transition-colors hover:bg-harbor-success hover:text-white hover:border-harbor-success"
      >
        <Power class="w-4 h-4" />
        Activar propiedad
      </button> -->
    </div>
  </div>
</template>
