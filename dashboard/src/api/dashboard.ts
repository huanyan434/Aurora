import api from '.'
import type { DashboardOverview, User, Conversation, PointsRecord } from '@/types'

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

export interface ConversationsResponse {
  success: boolean
  data: {
    conversations: Conversation[]
    total: number
  }
}

export interface PointsResponse {
  success: boolean
  data: {
    records: PointsRecord[]
    total: number
  }
}

export const dashboardApi = {
  // 获取概览数据
  getOverview: () => api.get<OverviewResponse>('/dashboard/overview'),
  
  // 获取用户列表
  getUsers: (page = 1, pageSize = 20) => 
    api.get<UsersResponse>(`/dashboard/users?page=${page}&pageSize=${pageSize}`),
  
  // 获取对话列表
  getConversations: (page = 1, pageSize = 20) => 
    api.get<ConversationsResponse>(`/dashboard/conversations?page=${page}&pageSize=${pageSize}`),
  
  // 获取积分记录
  getPointsRecords: (page = 1, pageSize = 20) => 
    api.get<PointsResponse>(`/dashboard/points_records?page=${page}&pageSize=${pageSize}`)
}
