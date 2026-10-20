export interface User {
  /** Opcional: las sesiones guardadas antes de que el login lo devolviera no lo tienen. */
  id?: number
  username: string
  role: string
  first_name: string
  last_name: string
  phone: string
}

export interface LoginPayload {
  username: string
  password: string
  /** Nombre del dispositivo, para identificar la sesion en auth.refresh_token. */
  device_label?: string
}

export interface LoginResponse {
  status: string
  access_token: string
  /** Opcional: la API anterior a la rotacion de tokens no lo enviaba. */
  refresh_token?: string
  id: number
  token_type: string
  username: string
  role: string
  first_name: string
  last_name: string
  phone: string
}

export interface RefreshResponse {
  status: string
  access_token: string
  refresh_token: string
  token_type: string
}
