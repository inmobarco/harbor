export interface User {
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
  token_type: string
  username: string
  role: string
  first_name: string
  last_name: string
  phone: string
}
