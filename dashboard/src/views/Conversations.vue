<template>
  <div class="page-container animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">对话管理</h1>
      <p class="page-subtitle">查看所有用户的对话记录</p>
    </div>

    <!-- 对话列表 -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>对话 ID</th>
            <th>标题</th>
            <th>摘要</th>
            <th>创建时间</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="conv in conversations" :key="conv.id" class="table-row">
            <td>
              <div class="conversation-info">
                <div class="conversation-icon">💬</div>
                <span class="conversation-id">{{ conv.id }}</span>
              </div>
            </td>
            <td>
              <span class="font-semibold">{{ conv.title }}</span>
            </td>
            <td>
              <span class="text-muted conversation-summary">{{ conv.summary || '暂无摘要' }}</span>
            </td>
            <td>
              <span class="time-display">{{ formatDate(conv.createdAt) }}</span>
            </td>
            <td>
              <span class="time-display">{{ formatDate(conv.updatedAt) }}</span>
            </td>
          </tr>
          <tr v-if="conversations.length === 0">
            <td colspan="5" class="empty-state">
              <span class="empty-icon">📭</span>
              <p>暂无对话数据</p>
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
            :disabled="conversations.length < pageSize"
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
import type { Conversation } from '@/types'

const conversations = ref<Conversation[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadConversations = async () => {
  try {
    const response = await dashboardApi.getConversations(page.value, pageSize.value)
    conversations.value = response.data.data.conversations
    total.value = response.data.data.total
  } catch (error) {
    console.error('加载对话列表失败:', error)
  }
}

const changePage = (newPage: number) => {
  if (newPage < 1) return
  page.value = newPage
  loadConversations()
}

onMounted(() => {
  loadConversations()
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
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
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
  background: #f0f9ff;
}

.data-table td {
  padding: 16px 20px;
  font-size: 14px;
}

/* 对话信息 */
.conversation-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.conversation-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.conversation-id {
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

.conversation-summary {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 300px;
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
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-top: 1px solid var(--border-color);
}

.table-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.table-info .font-semibold {
  color: var(--info-color);
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
  background: var(--info-color);
  color: white;
  border-color: var(--info-color);
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

  .conversation-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .conversation-summary {
    max-width: 150px;
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
