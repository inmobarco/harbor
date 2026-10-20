<script setup lang="ts">
import { Menu } from 'lucide-vue-next'

const authStore = useAuthStore()
const { open: sidebarOpen, toggle: toggleSidebar } = useSidebar()

const displayName = computed(() => {
  if (!authStore.user) return 'Usuario'
  return `${authStore.user.first_name} ${authStore.user.last_name}`
})

const initials = computed(() => {
  if (!authStore.user) return 'U'
  return `${authStore.user.first_name[0]}${authStore.user.last_name[0]}`.toUpperCase()
})
</script>

<template>
  <header class="h-16 bg-white border-b border-harbor-gray flex items-center justify-between px-6">
    <!-- Con el menu cerrado, el boton para abrirlo queda en la esquina superior izquierda -->
    <div class="flex items-center gap-3">
      <template v-if="!sidebarOpen">
        <button
          type="button"
          class="-ml-2 grid h-9 w-9 place-items-center rounded-lg text-harbor-black/70 hover:bg-harbor-surface-gray hover:text-harbor-black transition-colors"
          aria-label="Mostrar menu"
          aria-controls="app-sidebar"
          :aria-expanded="false"
          title="Mostrar menu"
          @click="toggleSidebar"
        >
          <Menu class="h-5 w-5" />
        </button>
        <NuxtLink to="/" class="flex items-center gap-2">
          <img src="/isotipo.png" alt="Inmobarco" class="h-7 w-auto" />
          <span class="text-lg font-bold text-harbor-blue">Harbor</span>
        </NuxtLink>
      </template>
      <!-- TODO: Breadcrumb o título de sección -->
    </div>
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-harbor-blue flex items-center justify-center text-white text-sm font-bold">
          {{ initials }}
        </div>
        <span class="text-sm font-medium text-harbor-black">{{ displayName }}</span>
      </div>
    </div>
  </header>
</template>
