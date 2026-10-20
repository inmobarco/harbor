<script setup lang="ts">
import { PanelLeftClose } from 'lucide-vue-next'
import { ROUTE_MANAGE_ROLES } from '~/types/route'
import { MAINTENANCE_VIEW_ROLES } from '~/types/maintenance'

const authStore = useAuthStore()
const { logout } = useAuth()
const { open, toggle } = useSidebar()
const route = useRoute()

interface NavItem {
  label: string
  icon: string | null
  to: string
  sub?: boolean
  roles?: readonly string[]
}

const allNavItems: NavItem[] = [
  { label: 'Dashboard', icon: 'LayoutDashboard', to: '/' },
  { label: 'Propiedades', icon: 'Building2', to: '/propiedades' },
  { label: 'Inactivas', icon: null, to: '/propiedades?status=inactive', sub: true },
  { label: 'Agenda', icon: 'Calendar', to: '/agenda' },
  { label: 'Mapa', icon: 'Map', to: '/mapa' },
  { label: 'Rutero', icon: 'Route', to: '/rutero', roles: ROUTE_MANAGE_ROLES },
  { label: 'Mantenimiento', icon: 'Wrench', to: '/mantenimiento', roles: MAINTENANCE_VIEW_ROLES },
  { label: 'Asesores', icon: 'Users', to: '/asesores' },
]

const navItems = computed(() =>
  allNavItems.filter(item => !item.roles || item.roles.includes(authStore.user?.role ?? ''))
)

function isActive(item: NavItem) {
  if (item.to === '/propiedades') return route.path === '/propiedades' && !route.query.status
  if (item.to.includes('?status=inactive')) return route.path === '/propiedades' && route.query.status === 'inactive'
  return route.path === item.to
}
</script>

<template>
  <!-- inert al cerrarse: fuera de pantalla no debe recibir foco ni clics -->
  <aside
    id="app-sidebar"
    class="w-64 bg-harbor-black text-white h-screen flex flex-col fixed top-0 left-0 z-40 transition-transform duration-200 motion-reduce:transition-none"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
    :inert="!open"
    aria-label="Menu principal"
  >
    <!-- Logo -->
    <div class="px-4 py-6 border-b border-white/10 flex items-center gap-3">
      <button
        type="button"
        class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-harbor-gray hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Ocultar menu"
        aria-controls="app-sidebar"
        :aria-expanded="open"
        title="Ocultar menu"
        @click="toggle"
      >
        <PanelLeftClose class="h-5 w-5" />
      </button>
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
