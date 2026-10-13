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
}

export interface LoginResponse {
  status: string
  access_token: string
  id: number
  token_type: string
  username: string
  role: string
  first_name: string
  last_name: string
  phone: string
}
