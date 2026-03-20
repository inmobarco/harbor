<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()

const navItems = [
  { label: 'Dashboard', icon: 'LayoutDashboard', to: '/' },
  { label: 'Propiedades', icon: 'Building2', to: '/propiedades' },
  { label: 'Agenda', icon: 'Calendar', to: '/agenda' },
  { label: 'Mapa', icon: 'Map', to: '/mapa' },
  { label: 'Asesores', icon: 'Users', to: '/asesores' },
]

function logout() {
  authStore.clearSession()
  router.push('/login')
}
</script>

<template>
  <aside class="w-64 bg-harbor-black text-white min-h-screen flex flex-col">
    <!-- Logo -->
    <div class="p-6 border-b border-white/10">
      <h1 class="text-xl font-bold text-harbor-blue">Harbor</h1>
      <p class="text-xs text-harbor-gray mt-1">by Inmobarco</p>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-1">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-harbor-gray hover:text-white hover:bg-white/10 transition-colors"
        active-class="!text-white !bg-harbor-blue/20 !text-harbor-blue"
      >
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <!-- Cerrar sesión -->
    <div class="p-4 border-t border-white/10">
      <button
        @click="logout"
        class="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-harbor-gray hover:text-white hover:bg-white/10 transition-colors"
      >
        Cerrar sesión
      </button>
    </div>
  </aside>
</template>
