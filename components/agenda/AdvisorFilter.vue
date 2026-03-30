<script setup lang="ts">
import { Checkbox } from '~/components/ui/checkbox'

const { advisors, visibleAdvisorIds, toggleAdvisorVisibility } = useAgenda()
</script>

<template>
  <div>
    <h3 class="text-xs font-semibold text-harbor-black/60 uppercase tracking-wider mb-3">
      Asesores
    </h3>
    <div class="space-y-2">
      <label
        v-for="advisor in advisors"
        :key="advisor.id"
        class="flex items-center gap-2.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-harbor-white transition-colors"
      >
        <Checkbox
          :model-value="visibleAdvisorIds.has(advisor.id)"
          @update:model-value="toggleAdvisorVisibility(advisor.id)"
        />
        <span
          class="w-2.5 h-2.5 rounded-full shrink-0"
          :style="{ backgroundColor: advisor.color }"
        />
        <span class="text-sm text-harbor-black truncate">{{ advisor.name }}</span>
      </label>
    </div>
  </div>
</template>
