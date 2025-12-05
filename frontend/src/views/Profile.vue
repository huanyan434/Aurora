<template>
  <div class="profile-container">
    <!-- 头部导航 -->
    <div class="header-container">
      <button @click="goBack" class="back-btn">
        <svg xmlns="http://www.w3.org/2000/svg" class="back-btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="page-title">个人中心</h1>
    </div>

    <div class="content-container">
      <!-- 用户信息卡片 -->
      <div class="user-info-card">
        <div class="user-info-content">
          <div class="user-avatar">
            {{ userInfo?.username?.charAt(0).toUpperCase() || 'U' }}
          </div>

          <div class="user-details">
            <h2 class="user-name">{{ userInfo?.username || '用户' }}</h2>
            <p class="user-email">{{ userInfo?.email || '未设置邮箱' }}</p>
          </div>

          <div class="user-stats">
            <div class="stat-item">
              <div class="stat-label">积分</div>
              <div class="stat-value">{{ userInfo?.points || 0 }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">会员状态</div>
              <div class="stat-value" :class="{ 'vip-status': userInfo?.isMember }">
                {{ getMemberLevelText(userInfo?.memberLevel) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能区域 -->
      <div class="features-grid">
        <!-- 签到卡片 -->
        <div class="feature-card">
          <div class="feature-card-content">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="feature-text">
              <h3 class="feature-title">每日签到</h3>
              <p class="feature-desc">{{ signInStatus ? '今日已签到' : '点击签到获取积分' }}</p>
            </div>
            <Button
              :disabled="signInStatus || signingIn"
              variant="secondary"
              @click="handleSignIn"
            >
              {{ signingIn ? '签到中...' : (signInStatus ? '已签到' : '签到') }}
            </Button>
          </div>
        </div>

        <!-- 会员开通 -->
        <div class="feature-card">
          <div class="feature-card-content">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div class="feature-text">
              <h3 class="feature-title">会员开通</h3>
              <p class="feature-desc">开通会员享受更多特权</p>
            </div>
            <Button
              @click="showVipUpgrade = true"
              variant="default"
            >
              {{ userInfo?.isMember ? '续费会员' : '开通会员' }}
            </Button>
          </div>
        </div>

        <!-- 积分充值 -->
        <div class="feature-card">
          <div class="feature-card-content">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="feature-text">
              <h3 class="feature-title">积分充值</h3>
              <p class="feature-desc">充值积分享受更多服务</p>
            </div>
            <Button
              @click="showPointsRecharge = true"
              variant="default"
            >
              充值积分
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- 会员开通弹窗 -->
    <div v-if="showVipUpgrade" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">会员开通</h2>
          <button @click="showVipUpgrade = false" class="modal-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" class="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="pricing-section">
            <div class="pricing-plans-container">
              <!-- VIP套餐 -->
              <div class="pricing-plan">
                <div class="plan-header">
                  <span class="plan-name">月VIP</span>
                  <span class="plan-price">￥5.00</span>
                </div>
                <ul class="plan-features">
                  <li>VIP使用模型半价（积分）</li>
                  <li>更多内测功能</li>
                </ul>
                <div class="plan-action-container">
                  <a href="https://afdian.com/a/mchyj" target="_blank">
                    <Button variant="outline" size="sm" class="plan-action-btn">发电</Button>
                  </a>
                </div>
              </div>

              <div class="pricing-plan">
                <div class="plan-header">
                  <span class="plan-name">季VIP</span>
                  <span class="plan-price">￥15.00</span>
                </div>
                <ul class="plan-features">
                  <li>VIP使用模型半价（积分）</li>
                  <li>更多内测功能</li>
                </ul>
                <div class="plan-action-container">
                  <a href="https://afdian.com/a/mchyj" target="_blank">
                    <Button variant="outline" size="sm" class="plan-action-btn">发电</Button>
                  </a>
                </div>
              </div>

              <div class="pricing-plan">
                <div class="plan-header">
                  <span class="plan-name">年VIP</span>
                  <div class="plan-price-container">
                    <span class="plan-original-price">￥60.00</span>
                    <span class="plan-price">￥55.00</span>
                  </div>
                </div>
                <ul class="plan-features">
                  <li>VIP使用模型半价（积分）</li>
                  <li>更多内测功能</li>
                </ul>
                <div class="plan-action-container">
                  <a href="https://afdian.com/a/mchyj" target="_blank">
                    <Button variant="outline" size="sm" class="plan-action-btn">发电</Button>
                  </a>
                </div>
              </div>

              <!-- SVIP套餐 -->
              <div class="pricing-plan">
                <div class="plan-header">
                  <span class="plan-name">月SVIP</span>
                  <span class="plan-price">￥10.00</span>
                </div>
                <ul class="plan-features">
                  <li>SVIP使用模型免费</li>
                  <li>更多内测功能</li>
                </ul>
                <div class="plan-action-container">
                  <a href="https://afdian.com/a/mchyj" target="_blank">
                    <Button variant="outline" size="sm" class="plan-action-btn">发电</Button>
                  </a>
                </div>
              </div>

              <div class="pricing-plan">
                <div class="plan-header">
                  <span class="plan-name">季SVIP</span>
                  <div class="plan-price-container">
                    <span class="plan-original-price">￥30.00</span>
                    <span class="plan-price">￥25.00</span>
                  </div>
                </div>
                <ul class="plan-features">
                  <li>SVIP使用模型免费</li>
                  <li>更多内测功能</li>
                </ul>
                <div class="plan-action-container">
                  <a href="https://afdian.com/a/mchyj" target="_blank">
                    <Button variant="outline" size="sm" class="plan-action-btn">发电</Button>
                  </a>
                </div>
              </div>

              <div class="pricing-plan">
                <div class="plan-header">
                  <span class="plan-name">年SVIP</span>
                  <div class="plan-price-container">
                    <span class="plan-original-price">￥120.00</span>
                    <span class="plan-price">￥108.00</span>
                  </div>
                </div>
                <ul class="plan-features">
                  <li>SVIP使用模型免费</li>
                  <li>更多内测功能</li>
                </ul>
                <div class="plan-action-container">
                  <a href="https://afdian.com/a/mchyj" target="_blank">
                    <Button variant="outline" size="sm" class="plan-action-btn">发电</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 订单号验证区域 -->
        <div class="verification-section">
          <div class="verification-input-group">
            <input
              v-model="vipOrderId"
              type="text"
              placeholder="请先在购买会员界面复制订单号，在此粘贴"
              class="verification-input"
            />
            <Button
              @click="verifyVipOrder"
              :disabled="verifyingVipOrder"
              variant="secondary"
            >
              {{ verifyingVipOrder ? '验证中...' : '验证' }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- 积分套餐弹窗 -->
    <div v-if="showPointsRecharge" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">积分套餐</h2>
          <button @click="showPointsRecharge = false" class="modal-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" class="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="pricing-section">
            <div class="pricing-plans-container">
              <div class="pricing-plan">
                <div class="plan-header">
                  <span class="plan-name">Aurora 积分</span>
                  <div class="plan-price-container">
                    <span class="plan-price">¥5.00</span>
                  </div>
                </div>
                <ul class="plan-features">
                  <li>文字转语音、语音转文字（开发中）</li>
                  <li>使用对话模型</li>
                </ul>
                <div class="plan-action-container">
                  <a href="https://afdian.com/a/mchyj?tab=shop" target="_blank">
                    <Button variant="outline" size="sm" class="plan-action-btn">发电</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 订单号验证区域 -->
        <div class="verification-section">
          <div class="verification-input-group">
            <input
              v-model="pointsOrderId"
              type="text"
              placeholder="请先在购买积分界面复制订单号，在此粘贴"
              class="verification-input"
            />
            <Button
              @click="verifyPointsOrder"
              :disabled="verifyingPointsOrder"
              variant="secondary"
            >
              {{ verifyingPointsOrder ? '验证中...' : '验证' }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { sign, verifyPoints, verifyVip, getHasSigned } from '@/api/user';
import { toastSuccess, toastError } from '@/components/ui/toast/use-toast';
import { Button } from '@/components/ui/button';

const router = useRouter();
const userStore = useUserStore();

// 响应式数据
const signInStatus = ref(false);
const signingIn = ref(false);
const showVipUpgrade = ref(false);
const showPointsRecharge = ref(false);
const vipOrderId = ref('');
const pointsOrderId = ref('');
const verifyingVipOrder = ref(false);
const verifyingPointsOrder = ref(false);

// 计算属性
const userInfo = computed(() => userStore.userInfo);

/**
 * 返回上一页
 */
const goBack = () => {
  router.go(-1);
};

/**
 * 获取会员等级显示文本
 * @param {string} memberLevel - 会员等级
 * @returns {string} 显示文本
 */
const getMemberLevelText = (memberLevel: string | undefined) => {
  if (!memberLevel || memberLevel === 'free') {
    return '普通用户';
  }
  return memberLevel + '用户';
};

/**
 * 处理签到
 */
const handleSignIn = async () => {
  signingIn.value = true;
  try {
    const result = await sign();
    if (result.data.success) {
      signInStatus.value = true;
      toastSuccess(`签到成功！获得 ${result.data.data?.points} 积分` || '签到成功！');
      // 刷新用户信息
      await userStore.init();
    } else {
      toastError(result.data.message || '签到失败');
    }
  } catch (error) {
    console.error('签到失败:', error);
    toastError('签到失败');
  } finally {
    signingIn.value = false;
  }
};

/**
 * 验证VIP订单
 */
const verifyVipOrder = async () => {
  if (!vipOrderId.value.trim()) {
    toastError('请输入订单号');
    return;
  }

  verifyingVipOrder.value = true;
  try {
    const response = await verifyVip({
      orderID: vipOrderId.value,
      force: false
    });

    if (response.data.success) {
      toastSuccess('VIP验证成功!');
      showVipUpgrade.value = false;
      vipOrderId.value = '';
      // 刷新用户信息以显示新的VIP状态
      await userStore.init();
    } else {
      toastError(response.data.message || '验证失败');
    }
  } catch (error) {
    console.error('验证VIP订单失败:', error);
    toastError('验证过程中出现错误');
  } finally {
    verifyingVipOrder.value = false;
  }
};

/**
 * 验证积分订单
 */
const verifyPointsOrder = async () => {
  if (!pointsOrderId.value.trim()) {
    toastError('请输入订单号');
    return;
  }

  verifyingPointsOrder.value = true;
  try {
    const response = await verifyPoints({
      orderID: pointsOrderId.value
    });

    if (response.data.success) {
      toastSuccess('积分充值验证成功!');
      showPointsRecharge.value = false;
      pointsOrderId.value = '';
      // 刷新用户信息以显示新的积分
      await userStore.init();
    } else {
      toastError(response.data.message || '验证失败');
    }
  } catch (error) {
    console.error('验证积分订单失败:', error);
    toastError('验证过程中出现错误');
  } finally {
    verifyingPointsOrder.value = false;
  }
};

/**
 * 检查签到状态
 */
const checkSignInStatus = async () => {
  try {
    const result = await getHasSigned();
    if (result.data.success) {
      signInStatus.value = result.data.signed;
    }
  } catch (error) {
    console.error('检查签到状态失败:', error);
  }
};

// 组件挂载时初始化数据
onMounted(async () => {
  // 获取用户信息
  await userStore.init();

  // 检查签到状态
  await checkSignInStatus();
});
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background-color: #f8fafc; /* bg-slate-50 */
  color: var(--color-gray-800);
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.dark .profile-container {
  background-color: #020817; /* dark:bg-slate-950 */
  color: var(--color-gray-100);
}

.header-container {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.back-btn {
  padding: 0.375rem; /* p-1.5 */
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-gray-700);
  transition: all 0.15s ease;
}

.back-btn:hover {
  background-color: #e2e8f0; /* hover:bg-slate-200 */
  color: #334155; /* hover:text-slate-700 */
}

.dark .back-btn:hover {
  background-color: #334155; /* dark:hover:bg-slate-700 */
  color: #f1f5f9; /* dark:hover:text-slate-100 */
}

.back-btn-icon {
  height: var(--spacing-lg);
  width: var(--spacing-lg);
}

.page-title {
  margin-left: var(--spacing-md);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.content-container {
  max-width: 64rem; /* max-w-4xl */
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  padding: 0 var(--spacing-md);
}

.user-info-card {
  background-color: var(--color-white);
  border: 1px solid #e2e8f0; /* border-slate-200 */
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  min-height: 140px;
  display: flex;
  align-items: center;
  position: relative;
}

.dark .user-info-card {
  background-color: #0f172a; /* dark:bg-slate-900 */
  border-color: #334155; /* dark:border-slate-700 */
}

.user-info-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  width: 100%;
}

@media (min-width: 768px) {
  .user-info-content {
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-lg);
  }
}

.user-avatar {
  width: 5rem;
  height: 5rem;
  border-radius: var(--border-radius-full);
  background-color: #e2e8f0; /* bg-slate-200 */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: #334155; /* text-slate-700 */
  border: 2px solid #cbd5e1; /* border-2 border-slate-300 */
  flex-shrink: 0;
}

.dark .user-avatar {
  background-color: #334155; /* dark:bg-slate-700 */
  color: #cbd5e1; /* dark:text-slate-300 */
  border-color: #475569; /* dark:border-slate-600 */
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

@media (min-width: 768px) {
  .user-details {
    align-items: flex-start;
    text-align: left;
  }
}


.user-name {
  font-size: var(--font-size-2xl);
  font-weight: 600; /* font-medium */
  color: #1e293b; /* text-slate-800 */
  margin: 0;
}

.dark .user-name {
  color: #f1f5f9; /* dark:text-slate-100 */
}

.user-email {
  color: #64748b; /* text-slate-500 */
  margin-top: var(--spacing-xs);
  margin-bottom: 0;
  font-size: var(--font-size-sm);
}

.dark .user-email {
  color: #94a3b8; /* dark:text-slate-400 */
}

.user-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--spacing-xl);
  margin-top: var(--spacing-md);
}

@media (min-width: 768px) {
  .user-stats {
    position: absolute;
    right: var(--spacing-xl);
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: var(--spacing-md);
    margin: 0;
  }
}

.stat-item {
  text-align: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: #f1f5f9; /* bg-slate-100 */
  border-radius: var(--border-radius-md);
  min-width: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 60px;
  width: 100px;
}

@media (min-width: 768px) {
  .stat-item {
    text-align: center;
  }
}

.dark .stat-item {
  background-color: #334155; /* dark:bg-slate-700 */
}

.stat-label {
  font-size: var(--font-size-sm);
  color: #64748b; /* text-slate-500 */
  margin: 0 auto var(--spacing-xs) auto;
  align-self: stretch;
  text-align: center;
}

.dark .stat-label {
  color: #94a3b8; /* dark:text-slate-400 */
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: #1e293b; /* text-slate-800 */
  margin: 0 auto;
  align-self: stretch;
  text-align: center;
}

.dark .stat-value {
  color: #f1f5f9; /* dark:text-slate-100 */
}

.vip-status {
  color: #ca8a04; /* text-amber-500 */
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.feature-card {
  background-color: var(--color-white);
  border: 1px solid #e2e8f0; /* border-slate-200 */
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  align-content: center;
}

.feature-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1; /* hover:border-slate-300 */
}

.dark .feature-card {
  background-color: #0f172a; /* dark:bg-slate-900 */
  border-color: #334155; /* dark:border-slate-700 */
}

.dark .feature-card:hover {
  border-color: #475569; /* dark:hover:border-slate-600 */
}

.feature-card-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.feature-icon {
  width: 3rem;
  height: 3rem;
  border-radius: var(--border-radius-lg);
  background-color: #e0f2fe; /* bg-sky-100 */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dark .feature-icon {
  background-color: #0c4a6e; /* dark:bg-sky-900/30 */
}

.icon {
  height: 1.5rem;
  width: 1.5rem;
  color: #0284c7; /* text-sky-600 */
}

.dark .icon {
  color: #7dd3fc; /* dark:text-sky-400 */
}

.feature-text {
  flex: 1;
}

.feature-title {
  font-weight: 500;
  margin: 0;
  color: #1e293b; /* text-slate-800 */
  font-size: var(--font-size-base);
}

.dark .feature-title {
  color: #f1f5f9; /* dark:text-slate-100 */
}

.feature-desc {
  font-size: var(--font-size-sm);
  color: #64748b; /* text-slate-500 */
  margin-top: var(--spacing-xs);
  margin-bottom: 0;
}

.dark .feature-desc {
  color: #94a3b8; /* dark:text-slate-400 */
}

.sign-in-btn {
  padding: var(--spacing-sm) var(--spacing-md); /* px-4 py-2 */
  border-radius: var(--border-radius-md); /* rounded-md */
  font-size: var(--font-size-sm); /* text-sm */
  font-weight: 500; /* font-medium */
  transition: color 150ms;
}

.sign-in-btn:hover {
  background-color: #2563eb; /* hover:bg-blue-600 */
}

.sign-in-btn:disabled {
  opacity: 0.5; /* disabled:opacity-50 */
}

.sign-in-btn-disabled {
  background-color: var(--color-gray-100); /* bg-gray-100 */
  color: var(--color-gray-500); /* text-gray-500 */
  cursor: not-allowed; /* cursor-not-allowed */
}

.dark .sign-in-btn-disabled {
  background-color: var(--color-gray-800); /* dark:bg-gray-800 */
  color: var(--color-gray-400); /* dark:text-gray-400 */
}

.vip-upgrade-btn {
  padding: var(--spacing-sm) var(--spacing-md); /* px-4 py-2 */
  background-color: #f59e0b; /* bg-amber-500 */
  color: var(--color-white); /* text-white */
  border-radius: var(--border-radius-md); /* rounded-md */
  font-size: var(--font-size-sm); /* text-sm */
  font-weight: 500; /* font-medium */
  transition: all 150ms;
}

.vip-upgrade-btn:hover {
  background-color: #d97706; /* hover:bg-amber-600 */
}

.points-recharge-btn {
  padding: var(--spacing-sm) var(--spacing-md); /* px-4 py-2 */
  background-color: #10b981; /* bg-green-500 */
  color: var(--color-white); /* text-white */
  border-radius: var(--border-radius-md); /* rounded-md */
  font-size: var(--font-size-sm); /* text-sm */
  font-weight: 500; /* font-medium */
  transition: all 150ms;
}

.points-recharge-btn:hover {
  background-color: #059669; /* hover:bg-green-600 */
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: var(--spacing-lg);
}

.modal-content {
  background-color: var(--color-white);
  border: 1px solid #e2e8f0; /* border-slate-200 */
  border-radius: var(--border-radius-lg);
  width: 100%;
  max-width: 60rem;
  max-height: 80vh;
  overflow-y: auto;
  padding: var(--spacing-lg);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideIn 0.2s ease-out;
}

.dark .modal-content {
  background-color: #0f172a; /* dark:bg-slate-900 */
  border-color: #334155; /* dark:border-slate-700 */
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid #e2e8f0; /* border-b border-slate-200 */
}

.dark .modal-header {
  border-bottom: 1px solid #334155; /* dark:border-slate-700 */
}

.modal-title {
  font-size: var(--font-size-xl);
  font-weight: 600; /* font-medium */
  color: #1e293b; /* text-slate-800 */
  margin: 0;
}

.dark .modal-title {
  color: #f1f5f9; /* dark:text-slate-100 */
}

.modal-close-btn {
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: none;
  cursor: pointer;
  color: #64748b; /* text-slate-500 */
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  background-color: #f1f5f9; /* hover:bg-slate-100 */
  color: #475569; /* hover:text-slate-600 */
}

.dark .modal-close-btn:hover {
  background-color: #334155; /* dark:hover:bg-slate-700 */
  color: #e2e8f0; /* dark:hover:text-slate-200 */
}

.modal-close-icon {
  height: var(--spacing-lg);
  width: var(--spacing-lg);
}

.modal-body {
  margin-bottom: var(--spacing-lg);
}

.modal-subtitle {
  font-weight: 500;
  margin-bottom: var(--spacing-sm);
  color: #1e293b; /* text-slate-800 */
}

.dark .modal-subtitle {
  color: #f1f5f9; /* dark:text-slate-100 */
}

.privileges-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.privilege-item {
  display: flex;
  align-items: flex-start;
  font-size: var(--font-size-sm);
  color: #475569; /* text-slate-600 */
}

.dark .privilege-item {
  color: #94a3b8; /* dark:text-slate-400 */
}

.privilege-check {
  color: #059669; /* text-emerald-600 */
  margin-right: var(--spacing-sm);
}

.vip-purchase-btn {
  margin-top: var(--spacing-md);
}

.points-purchase-btn {
  margin-top: var(--spacing-md);
}

.full-width {
  width: 100%;
}


.verification-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.verification-input-group {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.verification-input {
  flex: 1;
}

.pricing-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-gray-200);
}

.dark .pricing-section {
  border-top: 1px solid var(--color-gray-800);
}

.pricing-plans-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.pricing-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
  color: var(--color-gray-800);
}

.dark .pricing-title {
  color: var(--color-gray-200);
}

.pricing-plan {
  background-color: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  transition: all 150ms;
  position: relative;
  overflow: hidden;
}

.pricing-plan:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  border-color: var(--color-gray-300);
}

.dark .pricing-plan {
  background-color: var(--color-gray-900);
  border: 1px solid var(--color-gray-800);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3);
}

.dark .pricing-plan:hover {
  border-color: var(--color-gray-700);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-sm);
}

.plan-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-gray-900);
  margin: 0;
}

.dark .plan-name {
  color: var(--color-gray-100);
}

.plan-price {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-gray-900);
  margin: 0;
  line-height: 1;
}

.dark .plan-price {
  color: var(--color-gray-100);
}

.plan-original-price {
  font-size: var(--font-size-base);
  color: var(--color-gray-500);
  text-decoration: line-through;
  margin: 0;
  display: block;
  align-self: center;
}

.dark .plan-original-price {
  color: var(--color-gray-400);
}

.plan-duration {
  font-size: var(--font-size-sm);
  color: #64748b; /* text-slate-500 */
  margin-top: var(--spacing-xs);
  font-weight: var(--font-weight-medium);
}

.dark .plan-duration {
  color: #94a3b8; /* dark:text-slate-400 */
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: var(--spacing-md) 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.plan-features li {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-xs);
  color: #475569; /* text-slate-600 */
  font-size: var(--font-size-sm);
  padding: var(--spacing-xs) 0;
}

.dark .plan-features li {
  color: #94a3b8; /* dark:text-slate-400 */
}

.plan-features li::before {
  content: "✓";
  color: #059669; /* text-emerald-600 */
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1.25rem;
  width: 1.25rem;
  border-radius: 50%;
  background-color: #d1fae5; /* bg-emerald-100 */
  font-size: 0.75rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.dark .plan-features li::before {
  background-color: #047857; /* dark:bg-emerald-900/30 */
  color: #a7f3d0; /* dark:text-emerald-300 */
}

.plan-action-btn {
  display: inline-block;
  text-align: center;
  width: 100%;
}

.plan-price-container {
  display: flex;
  flex-direction: row-reverse;
  align-items: baseline;
  gap: var(--spacing-xs);
}

.plan-action-container {
  margin-top: var(--spacing-sm);
  display: flex;
  justify-content: flex-end;
}


.verification-input {
  width: 100%;
  padding: 0.625rem var(--spacing-md); /* p-2.5 */
  border: 1px solid #cbd5e1; /* border-slate-300 */
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  background-color: var(--color-white);
  color: #1e293b; /* text-slate-800 */
  transition: all 0.15s ease;
}

.dark .verification-input {
  background-color: #1e293b; /* dark:bg-slate-800 */
  border-color: #475569; /* dark:border-slate-600 */
  color: #f1f5f9; /* dark:text-slate-100 */
}

.verification-input:focus {
  outline: none;
  border-color: #94a3b8; /* focus:border-slate-400 */
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.2); /* focus:ring focus:ring-slate-400 focus:ring-opacity-50 */
}

.dark .verification-input:focus {
  border-color: #94a3b8; /* dark:focus:border-slate-400 */
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.2); /* dark:focus:ring-slate-400 */
}

.verification-btn {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: #38bdf8; /* bg-sky-500 */
  color: var(--color-white);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition: all 150ms;
  border: none;
  cursor: pointer;
}

.verification-btn:hover {
  background-color: #0ea5e9; /* hover:bg-sky-600 */
}

.verification-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.verification-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid #e2e8f0; /* border-t border-slate-200 */
}

.dark .verification-section {
  border-top: 1px solid #334155; /* dark:border-slate-700 */
}

.verification-input-group {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

@media (max-width: 640px) {
  .verification-input-group {
    flex-direction: column;
  }

  .verification-input {
    width: 100%;
  }
}
</style>