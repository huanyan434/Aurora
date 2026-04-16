export interface User {
  id: string
  username: string
  email: string
  isMember: boolean
  memberLevel: string
  points: number
  memberSince?: string
  memberUntil?: string
  createdAt?: string
  adminLevel?: number
}

export interface Conversation {
  id: string
  userId: string
  title: string
  summary: string
  createdAt: string
  updatedAt: string
}

export interface PointsRecord {
  id: string
  userId: string
  amount: number
  reason: string
  createdAt: string
}

export interface DashboardOverview {
  totalUsers: number
  todayNewUsers: number
  totalConversations: number
  todayConversations: number
  totalPointsIssued: number
  todayPointsIssued: number
  vipUsers: number
}
