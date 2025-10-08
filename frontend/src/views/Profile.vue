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
                  {{ getMemberLevelText(userInfo?.memberLevel) }}
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

        <!-- 会员开通 -->
        <n-card class="feature-card">
          <div class="feature-content">
            <div class="feature-icon">
              <n-icon size="24">
                <Crown />
              </n-icon>
            </div>
            <div class="feature-info">
              <h3>会员开通</h3>
              <p>开通会员享受更多特权</p>
            </div>
            <n-button
              type="warning"
              @click="showVipUpgrade = true"
            >
              {{ userInfo?.isMember ? '续费会员' : '开通会员' }}
            </n-button>
          </div>
        </n-card>

        <!-- 积分充值 -->
        <n-card class="feature-card">
          <div class="feature-content">
            <div class="feature-icon">
              <n-icon size="24">
                <Currency />
              </n-icon>
            </div>
            <div class="feature-info">
              <h3>积分充值</h3>
              <p>充值积分享受更多服务</p>
            </div>
            <n-button
              type="primary"
              @click="showPointsRecharge = true"
            >
              充值积分
            </n-button>
          </div>
        </n-card>
      </div>

      <!-- 会员开通弹窗 -->
      <n-modal v-model:show="showVipUpgrade" preset="card" title="会员开通" style="width: 500px;">
        <div class="vip-upgrade">
          <div class="vip-benefits">
            <h3>会员特权</h3>
            <ul>
              <li>VIP使用模型半价（积分）</li>
              <li>SVIP使用模型免费</li>
              <li>更多内测功能</li>
              <li>详见购买会员页面</li>
            </ul>
          </div>
          
          <!-- 购买会员按钮 -->
          <n-button 
            type="warning" 
            round 
            tag="a" 
            href="https://afdian.com/a/mchyj"
            target="_blank"
            block
            style="margin-bottom: 20px;"
          >
            购买会员
          </n-button>
          
          <!-- 订单号验证区域 -->
          <div class="order-verification">
            <n-input 
              v-model:value="vipOrderId" 
              type="text" 
              placeholder="请先在购买会员界面复制订单号，在此粘贴"
              style="margin-bottom: 10px;"
            />
            <n-button 
              type="primary" 
              @click="verifyVipOrder"
              :loading="verifyingVipOrder"
              block
            >
              验证
            </n-button>
          </div>
        </div>
      </n-modal>

      <!-- 积分充值弹窗 -->
      <n-modal v-model:show="showPointsRecharge" preset="card" title="积分充值" style="width: 500px;">
        <div class="points-recharge">
          <div class="points-benefits">
            <h3>积分用途</h3>
            <ul>
              <li>文字转语音、语音转文字（开发中）</li>
              <li>使用对话模型</li>
            </ul>
          </div>
          
          <!-- 购买积分按钮 -->
          <n-button 
            type="primary" 
            round 
            tag="a" 
            href="https://afdian.com/a/mchyj?tab=shop"
            target="_blank"
            block
            style="margin-bottom: 20px;"
          >
            购买积分
          </n-button>
          
          <!-- 订单号验证区域 -->
          <div class="order-verification">
            <n-input 
              v-model:value="pointsOrderId" 
              type="text" 
              placeholder="请先在购买积分界面复制订单号，在此粘贴"
              style="margin-bottom: 10px;"
            />
            <n-button 
              type="primary" 
              @click="verifyPointsOrder"
              :loading="verifyingPointsOrder"
              block
            >
              验证
            </n-button>
          </div>
        </div>
      </n-modal>
    </div>
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
  NInput,
  useMessage
} from 'naive-ui'
import {
  ArrowLeft,
  Calendar,
  Crown,
  Currency
} from '@vicons/tabler'
import { useUserStore } from '@/stores/user'

/**
 * 个人中心页面组件
 * 包含用户信息、签到、积分记录、会员开通等功能
 */

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

// 响应式数据
const signInStatus = ref(false)
const signingIn = ref(false)
const showPointsHistory = ref(false)
const showVipUpgrade = ref(false)
const showPointsRecharge = ref(false)
const showSettings = ref(false)
const savingSettings = ref(false)
const pointsHistory = ref([])
const vipOrderId = ref('')
const pointsOrderId = ref('')
const verifyingVipOrder = ref(false)
const verifyingPointsOrder = ref(false)

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
 * 获取会员等级显示文本
 * @param {string} memberLevel - 会员等级
 * @returns {string} 显示文本
 */
const getMemberLevelText = (memberLevel) => {
  if (!memberLevel || memberLevel === 'free') {
    return '普通用户'
  }
  return memberLevel + '用户'
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
      message.success(`签到成功！获得 ${result.data?.points} 积分`)
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
 * 验证VIP订单
 */
const verifyVipOrder = async () => {
  if (!vipOrderId.value.trim()) {
    message.warning('请输入订单号')
    return
  }

  verifyingVipOrder.value = true
  try {
    const response = await fetch('/api/verify_vip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        orderID: vipOrderId.value,
        force: false
      })
    })

    const result = await response.json()
    
    if (result.success) {
      message.success('VIP验证成功!')
      showVipUpgrade.value = false
      vipOrderId.value = ''
      // 刷新用户信息以显示新的VIP状态
      await userStore.getCurrentUser()
    } else {
      message.error(result.message || '验证失败')
    }
  } catch (error) {
    message.error('验证过程中出现错误')
  } finally {
    verifyingVipOrder.value = false
  }
}

/**
 * 验证积分订单
 */
const verifyPointsOrder = async () => {
  if (!pointsOrderId.value.trim()) {
    message.warning('请输入订单号')
    return
  }

  verifyingPointsOrder.value = true
  try {
    const response = await fetch('/api/verify_points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        orderID: pointsOrderId.value
      })
    })

    const result = await response.json()
    
    if (result.success) {
      message.success('积分充值验证成功!')
      showPointsRecharge.value = false
      pointsOrderId.value = ''
      // 刷新用户信息以显示新的积分
      await userStore.getCurrentUser()
    } else {
      message.error(result.message || '验证失败')
    }
  } catch (error) {
    message.error('验证过程中出现错误')
  } finally {
    verifyingPointsOrder.value = false
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
      signInStatus.value = result.data.signed
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

.vip-upgrade,
.points-recharge {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.vip-benefits ul,
.points-benefits ul {
  margin: 12px 0 0 0;
  padding-left: 20px;
}

.vip-benefits li,
.points-benefits li {
  margin-bottom: 8px;
  color: #666;
}

.order-verification {
  display: flex;
  flex-direction: column;
  gap: 10px;
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