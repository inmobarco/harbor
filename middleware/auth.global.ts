import { ROUTE_MANAGE_ROLES } from '~/types/route'

/** Rutas que exigen un rol especifico ademas de la sesion. */
const ROLE_RESTRICTED: Record<string, readonly string[]> = {
  '/rutero': ROUTE_MANAGE_ROLES,
}

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  auth.loadSession()

  if (!auth.isAuthenticated && to.path !== '/login') {
    return navigateTo('/login')
  }

  const allowedRoles = ROLE_RESTRICTED[to.path]
  if (allowedRoles && !allowedRoles.includes(auth.user?.role ?? '')) {
    return navigateTo('/')
  }
})
