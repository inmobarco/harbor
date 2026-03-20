import { defineStore } from 'pinia'
import type { User } from '~/types/auth'

const TOKEN_KEY = 'harbor_token'
const USER_KEY = 'harbor_user'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  function setSession(newToken: string, newUser: User) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function loadSession() {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedUser = localStorage.getItem(USER_KEY)
    if (savedToken && savedUser) {
      token.value = savedToken
      user.value = JSON.parse(savedUser)
    }
  }

  return { user, token, isAuthenticated, setSession, clearSession, loadSession }
})
