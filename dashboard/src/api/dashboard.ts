import api from '.'
import type { DashboardOverview, User, PointsRecord } from '@/types'

export interface OverviewResponse {
  success: boolean
  data: DashboardOverview
}

export interface UsersResponse {
  success: boolean
  data: {
    users: User[]
    total: number
    page: number
    pageSize: number
  }
}

export interface PointsResponse {
  success: boolean
  data: {
    records: PointsRecord[]
    total: number
  }
}

export interface UpdateUserRequest {
  userId: number
  points?: number
  isMember?: boolean
  memberLevel?: string
  memberSince?: string
  memberUntil?: string
}

export interface UpdateUserResponse {
  success: boolean
  message: string
}

export interface LoginRequest {
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
}

export const dashboardApi = {
  // 登录
  login: (data: LoginRequest) => api.post<LoginResponse>('/dashboard/login', data),
  
  // 获取概览数据
  getOverview: () => api.get<OverviewResponse>('/dashboard/overview'),
  
  // 获取用户列表
  getUsers: (page = 1, pageSize = 20) => 
    api.get<UsersResponse>(`/dashboard/users?page=${page}&pageSize=${pageSize}`),
  
  // 更新用户信息
  updateUser: (data: UpdateUserRequest) => 
    api.post<UpdateUserResponse>('/dashboard/users/update', data),
  
  // 获取积分记录
  getPointsRecords: (page = 1, pageSize = 20) => 
    api.get<PointsResponse>(`/dashboard/points_records?page=${page}&pageSize=${pageSize}`)
}
