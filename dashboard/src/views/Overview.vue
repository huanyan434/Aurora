<template>
  <div class="page-container animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">数据概览</h1>
      <p class="page-subtitle">欢迎回来！这是您的 Aurora 系统概览</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <!-- 总用户数 -->
      <div class="stat-card stat-card-primary">
        <div class="stat-header">
          <div class="stat-icon stat-icon-primary">
            <CircleUserRound class="w-10 h-10" color="#ffffff" />
          </div>
          <div class="stat-value">{{ overview.totalUsers }}</div>
        </div>
        <div class="stat-label">总用户数</div>
        <div class="stat-trend stat-trend-success">
          <span>+{{ overview.todayNewUsers }} 今日新增</span>
        </div>
      </div>

      <!-- 总对话数 -->
      <div class="stat-card stat-card-info">
        <div class="stat-header">
          <div class="stat-icon stat-icon-info">
            <MessageCircleMore class="w-10 h-10" color="#ffffff" />
          </div>
          <div class="stat-value">{{ overview.totalConversations }}</div>
        </div>
        <div class="stat-label">总对话数</div>
        <div class="stat-trend stat-trend-success">
          <span>+{{ overview.todayConversations }} 今日新增</span>
        </div>
      </div>

      <!-- 今日发放积分 -->
      <div class="stat-card stat-card-success">
        <div class="stat-header">
          <div class="stat-icon stat-icon-success">
            <Sparkle class="w-10 h-10" color="#ffffff" />
          </div>
          <div class="stat-value">{{ overview.todayPointsIssued.toLocaleString() }}</div>
        </div>
        <div class="stat-label">今日发放积分</div>
      </div>

      <!-- VIP 用户 -->
      <div class="stat-card stat-card-warning">
        <div class="stat-header">
          <div class="stat-icon stat-icon-warning">
            <UserStar class="w-10 h-10" color="#ffffff" />
          </div>
          <div class="stat-value">{{ overview.vipUsers }}</div>
        </div>
        <div class="stat-label">VIP 用户</div>
        <div class="stat-trend">
          <span v-if="overview.totalUsers > 0" class="stat-percent">
            {{ ((overview.vipUsers / overview.totalUsers) * 100).toFixed(1) }}%
          </span>
          <span class="stat-desc">会员占比</span>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="error" class="error-container">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dashboardApi } from '@/api/dashboard'
import type { DashboardOverview } from '@/types'
import { CircleUserRound, MessageCircleMore, Sparkle, UserStar } from 'lucide-vue-next'

const overview = ref<DashboardOverview>({
  totalUsers: 0,
  todayNewUsers: 0,
  totalConversations: 0,
  todayConversations: 0,
  totalPointsIssued: 0,
  todayPointsIssued: 0,
  vipUsers: 0
})

const loading = ref(true)
const error = ref('')

const loadOverview = async () => {
  try {
    loading.value = true
    const response = await dashboardApi.getOverview()
    overview.value = response.data.data
  } catch (err) {
    error.value = '加载概览数据失败，请检查网络连接'
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOverview()
})
</script>

<style scoped>
.page-container {
  max-width: 1400px;
}

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

/* 统计卡片网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

/* 统计卡片 */
.stat-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}

.stat-icon-primary {
  background: #18181b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon-info {
  background: #27272a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon-success {
  background: #27272a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon-warning {
  background: #27272a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: 12px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.stat-trend-success {
  color: var(--success-color);
  font-weight: 600;
}

.stat-percent {
  color: var(--text-primary);
  font-weight: 600;
}

.stat-desc {
  color: var(--text-muted);
  font-size: 13px;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 错误提示 */
.error-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  color: #dc2626;
  font-size: 15px;
}

.error-icon {
  font-size: 20px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 24px;
  }

  .stat-header {
    flex-direction: column;
    gap: 12px;
  }

  .stat-value {
    font-size: 32px;
  }
}
</style>
