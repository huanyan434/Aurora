<template>
  <div class="page-container animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">积分统计</h1>
      <p class="page-subtitle">查看所有用户的积分变动记录</p>
    </div>

    <!-- 积分记录列表 -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>记录 ID</th>
            <th>用户 ID</th>
            <th>积分变动</th>
            <th>原因</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in records" :key="record.id" class="table-row">
            <td>
              <div class="record-info">
                <div class="record-icon">📝</div>
                <span class="record-id">{{ record.id }}</span>
              </div>
            </td>
            <td>
              <span class="font-semibold">{{ record.userId }}</span>
            </td>
            <td>
              <div :class="['points-change', record.amount > 0 ? 'points-increase' : 'points-decrease']">
                <span class="points-arrow">{{ record.amount > 0 ? '⬆️' : '⬇️' }}</span>
                <span class="points-value">{{ record.amount > 0 ? '+' : '' }}{{ record.amount.toLocaleString() }}</span>
              </div>
            </td>
            <td>
              <span class="reason-badge">{{ record.reason }}</span>
            </td>
            <td>
              <span class="time-display">{{ formatTime(record.createdAt) }}</span>
            </td>
          </tr>
          <tr v-if="records.length === 0">
            <td colspan="5" class="empty-state">
              <span class="empty-icon">📭</span>
              <p>暂无积分记录</p>
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
            :disabled="records.length < pageSize"
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
import type { PointsRecord } from '@/types'

const records = ref<PointsRecord[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadRecords = async () => {
  try {
    const response = await dashboardApi.getPointsRecords(page.value, pageSize.value)
    records.value = response.data.data.records
    total.value = response.data.data.total
  } catch (error) {
    console.error('加载积分记录失败:', error)
  }
}

const changePage = (newPage: number) => {
  if (newPage < 1) return
  page.value = newPage
  loadRecords()
}

onMounted(() => {
  loadRecords()
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
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
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
  background: #f0fdf4;
}

.data-table td {
  padding: 16px 20px;
  font-size: 14px;
}

/* 记录信息 */
.record-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.record-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.record-id {
  font-size: 13px;
  color: var(--text-muted);
}

.font-semibold {
  font-weight: 600;
  color: var(--text-primary);
}

/* 积分变动 */
.points-change {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
}

.points-increase {
  color: var(--success-color);
}

.points-decrease {
  color: var(--danger-color);
}

.points-arrow {
  font-size: 14px;
}

.points-value {
  font-size: 15px;
}

/* 原因徽章 */
.reason-badge {
  display: inline-block;
  padding: 6px 14px;
  background: #f1f5f9;
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* 时间显示 */
.time-display {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* 表格底部 */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%);
  border-top: 1px solid var(--border-color);
}

.table-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.table-info .font-semibold {
  color: var(--success-color);
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
  background: var(--success-color);
  color: white;
  border-color: var(--success-color);
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

  .record-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .reason-badge {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
