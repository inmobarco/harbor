<script setup lang="ts">
// Layout wrapper: sidebar fija + topbar + contenido principal
</script>

<template>
  <div class="flex min-h-screen">
    <LayoutAppSidebar />
    <div class="flex-1 flex flex-col">
      <LayoutAppTopbar />
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
