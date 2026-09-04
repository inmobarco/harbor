<script setup lang="ts">
import { AlertTriangle, Phone } from 'lucide-vue-next'
import type { CrmAdvisorOverview } from '~/types/crm'
import { formatRelativeDays, statusStyle } from '~/composables/useCrm'

defineProps<{ overview: CrmAdvisorOverview }>()
</script>

<template>
  <div class="bg-white rounded-lg border border-harbor-gray p-4 flex flex-col">
    <!-- Asesor -->
    <div class="flex items-center gap-2 mb-3">
      <span
        class="w-2.5 h-2.5 rounded-full shrink-0"
        :style="{ backgroundColor: overview.advisor.color }"
      />
      <span class="text-sm font-bold text-harbor-black truncate flex-1">
        {{ overview.advisor.name }}
      </span>
      <span class="text-xs font-semibold text-harbor-black/60 shrink-0">
        {{ overview.stats.total }} cliente{{ overview.stats.total !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Conteos por estado -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-3">
      <span
        v-for="status in overview.stats.byStatus"
        :key="status.label"
        class="flex items-center gap-1.5 text-harbor-black/70"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="statusStyle(status.statusId).dot" />
        {{ status.label }}
        <strong class="font-semibold text-harbor-black">{{ status.count }}</strong>
      </span>
      <span v-if="!overview.stats.byStatus.length" class="text-harbor-black/40">Sin clientes</span>
    </div>

    <!-- Alerta de seguimiento -->
    <div
      v-if="overview.stats.staleOver30d > 0"
      class="flex items-center gap-1.5 text-xs text-amber-600 bg-harbor-warning/10 rounded-md px-2 py-1 mb-3"
    >
      <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
      {{ overview.stats.staleOver30d }} activo{{ overview.stats.staleOver30d !== 1 ? 's' : '' }} sin novedad +30d
    </div>

    <!-- Error de este asesor -->
    <p v-if="overview.error" class="text-xs text-harbor-error">{{ overview.error }}</p>

    <!-- Ultimos clientes agregados -->
    <div v-else-if="overview.clients.length" class="border-t border-harbor-gray pt-3 space-y-2">
      <p class="text-[11px] font-semibold text-harbor-black/40 uppercase tracking-wider">
        Ultimos agregados
      </p>
      <div
        v-for="client in overview.clients"
        :key="client.id"
        class="flex items-start gap-2"
      >
        <span
          class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
          :class="statusStyle(client.statusId).dot"
          :title="client.statusLabel"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm text-harbor-black truncate leading-tight">{{ client.name }}</p>
          <p class="text-[11px] text-harbor-black/45 flex items-center gap-1 truncate">
            <Phone v-if="client.phone" class="w-3 h-3 shrink-0" />
            <span v-if="client.phone" class="font-mono">{{ client.phone }}</span>
            <span v-else>Sin telefono</span>
            <span class="text-harbor-black/25">·</span>
            <span>{{ formatRelativeDays(client.daysSinceUpdate) }}</span>
          </p>
        </div>
        <span
          class="text-[10px] font-semibold rounded-full px-1.5 py-0.5 shrink-0"
          :class="[statusStyle(client.statusId).bg, statusStyle(client.statusId).text]"
        >
          {{ client.statusLabel }}
        </span>
      </div>
    </div>

    <p v-else class="text-xs text-harbor-black/40 border-t border-harbor-gray pt-3">
      Este asesor no tiene clientes en Wasi
    </p>
  </div>
</template>
