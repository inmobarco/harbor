<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const navItems = [
  { label: 'Dashboard', icon: 'LayoutDashboard', to: '/' },
  { label: 'Propiedades', icon: 'Building2', to: '/propiedades' },
  { label: 'Inactivas', icon: null, to: '/propiedades?status=inactive', sub: true },
  { label: 'Agenda', icon: 'Calendar', to: '/agenda' },
  { label: 'Mapa', icon: 'Map', to: '/mapa' },
  { label: 'Asesores', icon: 'Users', to: '/asesores' },
]

function isActive(item: typeof navItems[number]) {
  if (item.to === '/propiedades') return route.path === '/propiedades' && !route.query.status
  if (item.to.includes('?status=inactive')) return route.path === '/propiedades' && route.query.status === 'inactive'
  return route.path === item.to
}

function logout() {
  authStore.clearSession()
  router.push('/login')
}
</script>

<template>
  <aside class="w-64 bg-harbor-black text-white h-screen flex flex-col fixed top-0 left-0">
    <!-- Logo -->
    <div class="p-6 border-b border-white/10 flex items-center gap-3">
      <img src="/isotipo.png" alt="Inmobarco" class="h-9 w-auto shrink-0" />
      <div>
        <h1 class="text-xl font-bold text-harbor-blue">Harbor</h1>
        <p class="text-xs text-harbor-gray mt-0.5">by Inmobarco</p>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-1">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-lg text-sm font-medium transition-colors"
        :class="[
          item.sub ? 'px-4 py-2 ml-4 pl-3 border-l border-white/10' : 'px-4 py-3',
          isActive(item) ? 'text-white bg-harbor-blue/20 text-harbor-blue' : 'text-harbor-gray hover:text-white hover:bg-white/10'
        ]"
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
