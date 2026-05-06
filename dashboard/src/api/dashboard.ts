import api from '.'
import type { DashboardOverview, User, PointsRecord, Announcement } from '@/types'

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

export interface UpdateUserInfoRequest {
  userId: number
  username?: string
  password?: string
}

export interface UpdateUserInfoResponse {
  success: boolean
  message: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message: string
  data?: {
    username: string
    level: number
  }
}

export interface Admin {
  id: number
  username: string
  level: number
  created_at: string
  updated_at: string
}

export interface AdminsResponse {
  success: boolean
  data: Admin[]
}

export interface CreateAdminRequest {
  username: string
  password: string
  level: number
}

export interface UpdateAdminRequest {
  adminId: number
  username?: string
  password?: string
  level?: number
}

export interface DeleteAdminRequest {
  adminId: number
}

export interface AdminOperationResponse {
  success: boolean
  message: string
}

export interface AnnouncementResponse {
  success: boolean
  data: Announcement
  message?: string
}

export interface UpdateAnnouncementRequest {
  title: string
  summary: string
  content: string
  enabled: boolean
  version: string
}

export interface Notification {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface NotificationsResponse {
  success: boolean
  data: Notification[]
  message?: string
}

export interface CreateNotificationRequest {
  title: string
  content: string
}

export interface NotificationOperationResponse {
  success: boolean
  message: string
  data?: Notification
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

  // 更新用户用户名和密码
  updateUserInfo: (data: UpdateUserInfoRequest) =>
    api.post<UpdateUserInfoResponse>('/dashboard/users/update-info', data),

  // 获取积分记录
  getPointsRecords: (page = 1, pageSize = 20) =>
    api.get<PointsResponse>(`/dashboard/points_records?page=${page}&pageSize=${pageSize}`),

  // 公告管理接口
  getAnnouncement: () => api.get<AnnouncementResponse>('/dashboard/announcement'),

  updateAnnouncement: (data: UpdateAnnouncementRequest) =>
    api.post<AnnouncementResponse>('/dashboard/announcement', data),

  // 通知管理接口
  getNotifications: () => api.get<NotificationsResponse>('/dashboard/notifications'),

  createNotification: (data: CreateNotificationRequest) =>
    api.post<NotificationOperationResponse>('/dashboard/notifications', data),

  updateNotification: (id: string, data: CreateNotificationRequest) =>
    api.put<NotificationOperationResponse>(`/dashboard/notifications/${id}`, data),

  deleteNotification: (id: string) =>
    api.delete<NotificationOperationResponse>(`/dashboard/notifications/${id}`),

  // 管理员管理接口
  getAdmins: () => api.get<AdminsResponse>('/dashboard/admins'),

  createAdmin: (data: CreateAdminRequest) =>
    api.post<AdminOperationResponse>('/dashboard/admins/create', data),

  updateAdmin: (data: UpdateAdminRequest) =>
    api.post<AdminOperationResponse>('/dashboard/admins/update', data),

  deleteAdmin: (data: DeleteAdminRequest) =>
    api.post<AdminOperationResponse>('/dashboard/admins/delete', data)
}

