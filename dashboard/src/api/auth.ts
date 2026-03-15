import api from './index'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
}

export const authApi = {
  login: (data: LoginRequest) => api.post<LoginResponse>('/login', data),
  
  logout: () => api.post('/logout'),
  
  getCurrentUser: () => api.get('/current_user')
}
