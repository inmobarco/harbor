type ApiFetchOptions = NonNullable<Parameters<typeof $fetch>[1]>

function withBearer(opts: ApiFetchOptions, token: string | null): ApiFetchOptions {
  const headers = { ...(opts.headers as Record<string, string> | undefined) }
  if (token) headers.Authorization = `Bearer ${token}`
  return { ...opts, headers }
}

function errorStatus(err: any): number | undefined {
  return err?.response?.status ?? err?.statusCode
}

/** `detail` de FastAPI, o `statusMessage` cuando el 401 viene reenviado por una ruta de server/. */
function errorDetail(err: any): string | undefined {
  return err?.data?.detail ?? err?.data?.statusMessage
}

/**
 * $fetch autenticado contra la API propia. Agrega el access token y, si la
 * API responde 401 token_expired, renueva la sesion y reintenta una vez.
 * Si la sesion ya no es valida la limpia; el plugin auth redirige al login.
 */
export async function apiFetch<T = any>(url: string, opts: ApiFetchOptions = {}): Promise<T> {
  const authStore = useAuthStore()
  const sentToken = authStore.token

  try {
    return (await $fetch(url, withBearer(opts, sentToken))) as T
  } catch (err) {
    if (errorStatus(err) !== 401) throw err

    const detail = errorDetail(err)
    if (detail === 'token_invalid' || detail === 'user_inactive') {
      authStore.clearSession()
      throw err
    }
    if (detail !== 'token_expired') throw err

    const freshToken = await authStore.refreshAccessToken(sentToken)
    if (!freshToken) throw err

    // Reintento con $fetch directo: si vuelve a fallar no se entra en bucle
    return (await $fetch(url, withBearer(opts, freshToken))) as T
  }
}
