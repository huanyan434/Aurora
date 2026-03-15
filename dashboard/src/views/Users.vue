<template>
  <div class="page-container animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <p class="page-subtitle">管理系统中的所有用户</p>
    </div>

    <!-- 用户表格 -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>用户名</th>
            <th>邮箱</th>
            <th>会员等级</th>
            <th>积分</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="table-row">
            <td>
              <div class="user-info">
                <div class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</div>
                <span class="user-id">{{ user.id }}</span>
              </div>
            </td>
            <td>
              <span class="font-semibold">{{ user.username }}</span>
            </td>
            <td>
              <span class="text-muted">{{ user.email }}</span>
            </td>
            <td>
              <span :class="['badge', getMemberLevelClass(user.memberLevel)]">
                <span class="badge-icon">{{ getMemberLevelIcon(user.memberLevel) }}</span>
                {{ getMemberLevelText(user.memberLevel) }}
              </span>
            </td>
            <td>
              <div class="points-display">
                <span class="points-icon">💎</span>
                <span class="points-value">{{ user.points.toLocaleString() }}</span>
              </div>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="5" class="empty-state">
              <span class="empty-icon">📭</span>
              <p>暂无用户数据</p>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 分页 -->
      <div class="table-footer">
        <p class="table-info">
          共 <span class="font-semibold">{{ total }}</span> 条记录
        </p>
        <div class="pagination">
          <button
            @click="changePage(page - 1)"
            :disabled="page === 1"
            class="pagination-btn"
          >
            ← 上一页
          </button>
          <span class="page-number">第 {{ page }} 页</span>
          <button
            @click="changePage(page + 1)"
            :disabled="users.length < pageSize"
            class="pagination-btn"
          >
            下一页 →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dashboardApi } from '@/api/dashboard'
import type { User } from '@/types'

const users = ref<User[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const getMemberLevelClass = (level: string) => {
  const classes: Record<string, string> = {
    free: 'badge-default',
    VIP: 'badge-primary',
    SVIP: 'badge-warning'
  }
  return classes[level] || classes.free
}

const getMemberLevelIcon = (level: string) => {
  const icons: Record<string, string> = {
    free: '👤',
    VIP: '⭐',
    SVIP: '👑'
  }
  return icons[level] || '👤'
}

const getMemberLevelText = (level: string) => {
  const texts: Record<string, string> = {
    free: '免费用户',
    VIP: 'VIP 会员',
    SVIP: 'SVIP 会员'
  }
  return texts[level] || '免费用户'
}

const loadUsers = async () => {
  try {
    const response = await dashboardApi.getUsers(page.value, pageSize.value)
    users.value = response.data.data.users
    total.value = response.data.data.total
  } catch (error) {
    console.error('加载用户列表失败:', error)
  }
}

const changePage = (newPage: number) => {
  if (newPage < 1) return
  page.value = newPage
  loadUsers()
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
}

/* 表格容器 */
.table-container {
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

/* 数据表格 */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 2px solid var(--border-color);
}

.data-table th {
  padding: 16px 20px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table tbody tr {
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
}

.data-table tbody tr:hover {
  background: #f8fafc;
}

.data-table td {
  padding: 16px 20px;
  font-size: 14px;
}

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.user-id {
  font-size: 13px;
  color: var(--text-muted);
}

.font-semibold {
  font-weight: 600;
  color: var(--text-primary);
}

.text-muted {
  color: var(--text-secondary);
}

/* 徽章 */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.badge-default {
  background: #f1f5f9;
  color: #64748b;
}

.badge-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.badge-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  color: white;
}

.badge-icon {
  font-size: 14px;
}

/* 积分显示 */
.points-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.points-icon {
  font-size: 16px;
}

.points-value {
  font-weight: 600;
  color: var(--primary-color);
}

/* 表格底部 */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-top: 1px solid var(--border-color);
}

.table-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.table-info .font-semibold {
  color: var(--primary-color);
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-number {
  padding: 8px 16px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px !important;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .data-table {
    font-size: 13px;
  }

  .data-table th,
  .data-table td {
    padding: 12px 10px;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .table-footer {
    flex-direction: column;
    gap: 12px;
  }

  .pagination {
    width: 100%;
    justify-content: center;
  }
}
</style>
