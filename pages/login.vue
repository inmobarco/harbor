<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { login, loading, error } = useAuth()

const form = reactive({
  username: '',
  password: '',
})

async function handleSubmit() {
  await login(form)
}
</script>

<template>
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-harbor-black">Harbor</h1>
      <p class="text-harbor-black/60 mt-2">Inicia sesión para continuar</p>
    </div>

    <form
      class="bg-white rounded-xl border border-harbor-gray p-8"
      @submit.prevent="handleSubmit"
    >
      <div class="space-y-4">
        <div
          v-if="error"
          class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
        >
          {{ error }}
        </div>

        <div>
          <label class="block text-sm font-medium text-harbor-black mb-1">Usuario</label>
          <input
            v-model="form.username"
            type="text"
            placeholder="tu.usuario"
            required
            class="w-full px-4 py-2 rounded-lg border border-harbor-gray focus:outline-none focus:ring-2 focus:ring-harbor-blue"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-harbor-black mb-1">Contraseña</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            required
            class="w-full px-4 py-2 rounded-lg border border-harbor-gray focus:outline-none focus:ring-2 focus:ring-harbor-blue"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2 px-4 bg-harbor-blue text-white font-semibold rounded-lg hover:bg-harbor-blue-dark transition-colors disabled:opacity-50"
        >
          {{ loading ? 'Ingresando...' : 'Iniciar sesión' }}
        </button>
      </div>
    </form>
  </div>
</template>
