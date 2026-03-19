<script setup lang="ts">
// Página de login — sin sidebar, sin middleware auth
definePageMeta({
  layout: 'auth',
})
</script>

<template>
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-harbor-black">Harbor</h1>
      <p class="text-harbor-black/60 mt-2">Inicia sesión para continuar</p>
    </div>

    <div class="bg-white rounded-xl border border-harbor-gray p-8">
      <!-- TODO: Formulario de login -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-harbor-black mb-1">Email</label>
          <input
            type="email"
            placeholder="tu@inmobarco.com"
            class="w-full px-4 py-2 rounded-lg border border-harbor-gray focus:outline-none focus:ring-2 focus:ring-harbor-blue"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-harbor-black mb-1">Contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            class="w-full px-4 py-2 rounded-lg border border-harbor-gray focus:outline-none focus:ring-2 focus:ring-harbor-blue"
          />
        </div>
        <button class="w-full py-2 px-4 bg-harbor-blue text-white font-semibold rounded-lg hover:bg-harbor-blue-dark transition-colors">
          Iniciar sesión
        </button>
      </div>
    </div>
  </div>
</template>
