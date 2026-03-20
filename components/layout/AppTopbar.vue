<script setup lang="ts">
const authStore = useAuthStore()

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
    <div>
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
