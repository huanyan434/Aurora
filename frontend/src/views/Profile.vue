<template>
  <div class="profile-container">
    <!-- 头部导航 -->
    <div class="profile-header">
      <n-button
        quaternary
        circle
        @click="goBack"
        class="back-btn"
      >
        <template #icon>
          <n-icon>
            <ArrowLeft />
          </n-icon>
        </template>
      </n-button>
      <h1>个人中心</h1>
    </div>

    <div class="profile-content">
      <!-- 用户信息卡片 -->
      <n-card class="user-info-card">
        <div class="user-info">
          <n-avatar
            :size="80"
            :src="userInfo?.avatar"
            :fallback-src="'/user-avatar.png'"
            class="user-avatar"
          >
            {{ userInfo?.username?.charAt(0).toUpperCase() || 'U' }}
          </n-avatar>
          
          <div class="user-details">
            <h2>{{ userInfo?.username || '用户' }}</h2>
            <p class="user-email">{{ userInfo?.email || '未设置邮箱' }}</p>
            <div class="user-stats">
              <div class="stat-item">
                <span class="stat-label">积分</span>
                <span class="stat-value">{{ userInfo?.points || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">VIP状态</span>
                <span class="stat-value" :class="{ 'vip': userInfo?.isMember }">
                  {{ userInfo?.isMember ? 'VIP用户' : '普通用户' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </n-card>

      <!-- 功能区域 -->
      <div class="feature-grid">
        <!-- 签到卡片 -->
        <n-card class="feature-card">
          <div class="feature-content">
            <div class="feature-icon">
              <n-icon size="24">
                <Calendar />
              </n-icon>
            </div>
            <div class="feature-info">
              <h3>每日签到</h3>
              <p>{{ signInStatus ? '今日已签到' : '点击签到获取积分' }}</p>
            </div>
            <n-button
              type="primary"
              :disabled="signInStatus || signingIn"
              :loading="signingIn"
              @click="handleSignIn"
            >
              {{ signInStatus ? '已签到' : '签到' }}
            </n-button>
          </div>
        </n-card>

        <!-- VIP升级 -->
        <n-card class="feature-card">
          <div class="feature-content">
            <div class="feature-icon">
              <n-icon size="24">
                <Crown />
              </n-icon>
            </div>
            <div class="feature-info">
              <h3>VIP升级</h3>
              <p>升级VIP享受更多特权</p>
            </div>
            <n-button
              type="warning"
              :disabled="userInfo?.isMember"
              @click="showVipUpgrade = true"
            >
              {{ userInfo?.isMember ? '已是VIP' : '升级VIP' }}
            </n-button>
          </div>
        </n-card>
    </div>

    <!-- VIP升级弹窗 -->
    <n-modal v-model:show="showVipUpgrade" preset="card" title="VIP升级" style="width: 500px;">
      <div class="vip-upgrade">
        <div class="vip-benefits">
          <h3>VIP特权</h3>
          <ul>
            <li>无限制对话次数</li>
            <li>优先使用最新模型</li>
            <li>专属客服支持</li>
            <li>更快的响应速度</li>
          </ul>
        </div>
        <div class="vip-pricing">
          <div class="price-item">
            <h4>月度VIP</h4>
            <div class="price">¥29.9/月</div>
            <n-button type="primary" block @click="handleVipUpgrade('monthly')">
              立即升级
            </n-button>
          </div>
          <div class="price-item">
            <h4>年度VIP</h4>
            <div class="price">¥299/年</div>
            <div class="price-note">节省60元</div>
            <n-button type="primary" block @click="handleVipUpgrade('yearly')">
              立即升级
            </n-button>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard,
  NButton,
  NIcon,
  NAvatar,
  NModal,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NUpload,
  useMessage
} from 'naive-ui'
import {
  ArrowLeft,
  Calendar,
  Coins,
  Crown,
  Settings
} from '@vicons/tabler'
import { useUserStore } from '@/stores/user'

/**
 * 个人中心页面组件
 * 包含用户信息、签到、积分记录、VIP升级等功能
 */

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

// 响应式数据
const signInStatus = ref(false)
const signingIn = ref(false)
const showPointsHistory = ref(false)
const showVipUpgrade = ref(false)
const showSettings = ref(false)
const savingSettings = ref(false)
const pointsHistory = ref([])

// 设置表单
const settingsForm = ref({
  username: '',
  email: '',
  avatar: ''
})

// 计算属性
const userInfo = computed(() => userStore.userInfo)

/**
 * 返回上一页
 */
const goBack = () => {
  router.go(-1)
}

/**
 * 处理签到
 */
const handleSignIn = async () => {
  signingIn.value = true
  try {
    const result = await userStore.signIn()
    if (result.success) {
      signInStatus.value = true
      message.success(`签到成功！获得 ${result.data.points} 积分`)
      // 刷新用户信息
      await userStore.getCurrentUser()
    } else {
      message.error(result.message || '签到失败')
    }
  } catch (error) {
    message.error('签到失败')
  } finally {
    signingIn.value = false
  }
}

/**
 * 处理VIP升级
 * @param {string} type - 升级类型 (monthly/yearly)
 */
const handleVipUpgrade = (type) => {
  // TODO: 实现VIP升级功能
  message.info('VIP升级功能开发中...')
  showVipUpgrade.value = false
}

/**
 * 处理头像上传
 * @param {Object} options - 上传选项
 */
const handleAvatarChange = (options) => {
  const { file } = options
  if (file) {
    // TODO: 实现头像上传功能
    message.info('头像上传功能开发中...')
  }
}

/**
 * 格式化时间
 * @param {string} time - 时间字符串
 * @returns {string} 格式化后的时间
 */
const formatTime = (time) => {
  return new Date(time).toLocaleString('zh-CN')
}

/**
 * 检查签到状态
 */
const checkSignInStatus = async () => {
  try {
    const result = await userStore.checkSignInStatus()
    if (result.success) {
      signInStatus.value = result.data.hasSignedIn
    }
  } catch (error) {
    console.error('检查签到状态失败:', error)
  }
}

// 组件挂载时初始化数据
onMounted(async () => {
  // 获取用户信息
  await userStore.getCurrentUser()
  
  // 检查签到状态
  await checkSignInStatus()
  
  // 获取积分记录
  await fetchPointsHistory()
  
  // 初始化设置表单
  if (userInfo.value) {
    settingsForm.value = {
      username: userInfo.value.username || '',
      email: userInfo.value.email || '',
      avatar: userInfo.value.avatar || ''
    }
  }
})
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.profile-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  margin-right: 16px;
}

.profile-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.profile-content {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.user-info-card {
  margin-bottom: 24px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-details h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.user-email {
  margin: 0 0 16px 0;
  color: #666;
  font-size: 14px;
}

.user-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.stat-value.vip {
  color: #f0a020;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.feature-card {
  height: 100%;
}

.feature-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.feature-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 8px;
  color: #666;
}

.feature-info {
  flex: 1;
}

.feature-info h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.feature-info p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.points-history {
  max-height: 400px;
  overflow-y: auto;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
}

.history-info {
  flex: 1;
}

.history-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.history-time {
  font-size: 12px;
  color: #999;
}

.history-points {
  font-size: 16px;
  font-weight: 600;
}

.history-points.positive {
  color: #52c41a;
}

.history-points.negative {
  color: #ff4d4f;
}

.vip-upgrade {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.vip-benefits ul {
  margin: 12px 0 0 0;
  padding-left: 20px;
}

.vip-benefits li {
  margin-bottom: 8px;
  color: #666;
}

.vip-pricing {
  display: flex;
  gap: 16px;
}

.price-item {
  flex: 1;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  text-align: center;
}

.price-item h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.price {
  font-size: 24px;
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 8px;
}

.price-note {
  font-size: 12px;
  color: #52c41a;
  margin-bottom: 16px;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .profile-content {
    padding: 16px;
  }
  
  .user-info {
    flex-direction: column;
    text-align: center;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
  }
  
  .feature-content {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .vip-pricing {
    flex-direction: column;
  }
}
</style>