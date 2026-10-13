<script setup lang="ts">
import { computed } from 'vue'
import { User } from 'lucide-vue-next'

const props = defineProps<{
  userId: number | null
  name: string | null
  size?: 'sm' | 'md'
}>()

const { assigneeColor } = useMaintenance()

const initials = computed(() =>
  (props.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('') || '?'
)

const sizeClass = computed(() => props.size === 'md' ? 'h-8 w-8 text-xs' : 'h-6 w-6 text-[10px]')
</script>

<template>
  <span
    v-if="userId !== null"
    class="inline-grid place-items-center rounded-full font-bold text-white shrink-0"
    :class="sizeClass"
    :style="{ backgroundColor: assigneeColor(userId) ?? undefined }"
    :title="name ?? undefined"
  >
    {{ initials }}
  </span>
  <span
    v-else
    class="inline-grid place-items-center rounded-full border-[1.5px] border-dashed border-harbor-gray text-harbor-black/40 shrink-0"
    :class="sizeClass"
    title="Sin asignar"
  >
    <User class="h-3 w-3" />
  </span>
</template>
