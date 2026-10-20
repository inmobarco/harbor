<script setup lang="ts">
// Layout wrapper: sidebar desplegable + topbar + contenido principal
const { open } = useSidebar()
</script>

<template>
  <div class="min-h-screen">
    <LayoutAppSidebar />
    <div
      class="flex-1 flex flex-col transition-[margin] duration-200 motion-reduce:transition-none"
      :class="open ? 'ml-64' : 'ml-0'"
    >
      <LayoutAppTopbar />
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
