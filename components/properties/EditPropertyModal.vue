<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Checkbox } from '~/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '~/components/ui/dialog'
import { STRATUM_OPTIONS } from '~/types/property'
import type { Property, PropertyUpdate } from '~/types/property'

type Operation = 'sale' | 'rent' | 'both'

const props = defineProps<{
  property: Property | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [id: number] }>()

const { getProperty, updateProperty } = useWasi()

const OPERATIONS: { value: Operation; label: string }[] = [
  { value: 'sale', label: 'Venta' },
  { value: 'rent', label: 'Arriendo' },
  { value: 'both', label: 'Venta y arriendo' },
]

// Los Select trabajan con strings; se convierten a numero al guardar
const operation = ref<Operation>('rent')
const area = ref<string | number>('')
const salePrice = ref<string | number>('')
const rentPrice = ref<string | number>('')
const bedrooms = ref('')
const bathrooms = ref('')
const garages = ref('')
const stratum = ref('')
const tvShare = ref(false)

const loading = ref(false)
const loaded = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

const isTrue = (v: unknown) => String(v) === 'true' || String(v) === '1'
const toNumber = (v: unknown) => Number(v) || 0

const forSale = computed(() => operation.value !== 'rent')
const forRent = computed(() => operation.value !== 'sale')

const displayRef = computed(() =>
  props.property?.reference || props.property?.registration_number || '—'
)

/** Opciones from..5; si el inmueble ya tiene un valor fuera del rango se agrega para no perderlo. */
function rangeOptions(current: string, from = 1) {
  const values = Array.from({ length: 6 - from }, (_, i) => String(from + i))
  if (current && !values.includes(current)) values.unshift(current)
  return values
}

const currencyFormat = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const formatPrice = (v: string | number) => (Number(v) > 0 ? currencyFormat.format(Number(v)) : '')

watch(open, async (isOpen) => {
  if (!isOpen || !props.property) return
  error.value = null
  loaded.value = false
  loading.value = true
  try {
    const p = await getProperty(props.property.id_property)
    const sale = isTrue(p.for_sale)
    const rent = isTrue(p.for_rent)
    operation.value = sale && rent ? 'both' : sale ? 'sale' : 'rent'
    area.value = toNumber(p.area) || toNumber(p.built_area) || toNumber(p.private_area) || ''
    salePrice.value = toNumber(p.sale_price) || ''
    rentPrice.value = toNumber(p.rent_price) || ''
    bedrooms.value = toNumber(p.bedrooms) ? String(toNumber(p.bedrooms)) : ''
    bathrooms.value = toNumber(p.bathrooms) ? String(toNumber(p.bathrooms)) : ''
    garages.value = String(toNumber(p.garages))
    stratum.value = toNumber(p.stratum) ? String(toNumber(p.stratum)) : ''
    tvShare.value = isTrue(p.tv_share)
    loaded.value = true
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'No se pudo cargar el inmueble'
  } finally {
    loading.value = false
  }
})

function validate(): string | null {
  if (!(Number(area.value) > 0)) return 'Indica el area del inmueble.'
  if (forSale.value && !(Number(salePrice.value) > 0)) return 'Indica el precio de venta.'
  if (forRent.value && !(Number(rentPrice.value) > 0)) return 'Indica el precio de arriendo.'
  if (!bedrooms.value || !bathrooms.value || !garages.value) return 'Completa habitaciones, banos y garajes.'
  return null
}

async function save() {
  if (!props.property || saving.value || !loaded.value) return
  const invalid = validate()
  if (invalid) {
    error.value = invalid
    return
  }

  const areaValue = Number(area.value)
  const data: PropertyUpdate = {
    for_sale: forSale.value ? 'true' : 'false',
    for_rent: forRent.value ? 'true' : 'false',
    area: areaValue,
    built_area: areaValue,
    private_area: areaValue,
    // Solo se envia el precio de la operacion activa; el otro queda como esta en Wasi
    ...(forSale.value ? { sale_price: Number(salePrice.value) } : {}),
    ...(forRent.value ? { rent_price: Number(rentPrice.value) } : {}),
    bedrooms: Number(bedrooms.value),
    bathrooms: Number(bathrooms.value),
    garages: Number(garages.value),
    ...(stratum.value ? { stratum: Number(stratum.value) } : {}),
    tv_share: tvShare.value ? 'true' : 'false',
  }

  saving.value = true
  error.value = null
  try {
    await updateProperty(props.property.id_property, data)
    emit('saved', props.property.id_property)
    open.value = false
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'No se pudo guardar el inmueble'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[560px]">
      <DialogHeader>
        <DialogTitle class="text-lg font-bold text-harbor-black">Modificar inmueble</DialogTitle>
        <DialogDescription v-if="property" class="text-sm text-harbor-black/60">
          <span class="font-mono">{{ displayRef }}</span> · ID {{ property.id_property }}
        </DialogDescription>
      </DialogHeader>

      <p v-if="loading" class="py-8 text-center text-sm text-harbor-black/50">Cargando inmueble...</p>

      <form v-else class="space-y-4" @submit.prevent="save">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Tipo de negocio</Label>
            <Select v-model="operation">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="o in OPERATIONS" :key="o.value" :value="o.value">{{ o.label }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Area (m²)</Label>
            <Input v-model="area" type="number" min="0" step="0.01" placeholder="Ej.: 108" />
          </div>

          <div v-if="forSale" class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Precio de venta</Label>
            <Input v-model="salePrice" type="number" min="0" step="1" placeholder="Ej.: 450000000" />
            <p class="text-xs text-harbor-black/50 h-4">{{ formatPrice(salePrice) }}</p>
          </div>

          <div v-if="forRent" class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Precio de arriendo</Label>
            <Input v-model="rentPrice" type="number" min="0" step="1" placeholder="Ej.: 3900000" />
            <p class="text-xs text-harbor-black/50 h-4">{{ formatPrice(rentPrice) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-4">
          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Habitaciones</Label>
            <Select v-model="bedrooms">
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="n in rangeOptions(bedrooms)" :key="n" :value="n">{{ n }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Baños</Label>
            <Select v-model="bathrooms">
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="n in rangeOptions(bathrooms)" :key="n" :value="n">{{ n }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Garajes</Label>
            <Select v-model="garages">
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="n in rangeOptions(garages, 0)" :key="n" :value="n">{{ n }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label class="text-sm font-semibold text-harbor-black">Estrato</Label>
            <Select v-model="stratum">
              <SelectTrigger><SelectValue placeholder="Sin estrato" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="s in STRATUM_OPTIONS" :key="s.value" :value="String(s.value)">{{ s.label }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <label class="flex items-center gap-2.5 cursor-pointer w-fit">
          <Checkbox v-model="tvShare" />
          <span class="text-sm font-semibold text-harbor-black">Tiene cuarto útil</span>
        </label>

        <p v-if="error" class="text-sm text-harbor-error">{{ error }}</p>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="saving || !loaded">
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
