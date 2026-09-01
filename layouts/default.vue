<script setup lang="ts">
// Layout principal con sidebar + topbar
const auth = useAuthStore()
const properties = usePropertiesStore()

// Precarga las propiedades en segundo plano al entrar a cualquier vista
// autenticada, para que el tab de Propiedades abra sin espera.
// Sin await: no bloquea el render de la pagina actual.
onMounted(() => {
  if (!auth.isAuthenticated) return
  properties.ensureLoaded().catch(() => {
    // Silencioso: es una precarga oportunista, la pagina reintenta al montarse
  })
})
</script>

<template>
  <div class="min-h-screen bg-harbor-white">
    <LayoutAppShell>
      <slot />
    </LayoutAppShell>
  </div>
</template>
