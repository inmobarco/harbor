<script setup lang="ts">
// Layout wrapper: sidebar fija + topbar + contenido principal
</script>

<template>
  <div class="min-h-screen">
    <LayoutAppSidebar />
    <div class="ml-64 flex-1 flex flex-col">
      <LayoutAppTopbar />
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
