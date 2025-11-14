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
            <div class="user-stats">
              <div class="stat-item">
                <div class="stat-label">积分</div>
                <div class="stat-value">{{ userInfo?.points || 0 }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">VIP状态</div>
                <div class="stat-value" :class="{ 'vip-status': userInfo?.isMember }">
                  {{ getMemberLevelText(userInfo?.memberLevel) }}
                </div>
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
            <button
              :disabled="signInStatus || signingIn"
              :class="['sign-in-btn', { 'sign-in-btn-disabled': signInStatus || signingIn }]"
              @click="handleSignIn"
            >
              {{ signingIn ? '签到中...' : (signInStatus ? '已签到' : '签到') }}
            </button>
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
            <button
              @click="showVipUpgrade = true"
              class="vip-upgrade-btn"
            >
              {{ userInfo?.isMember ? '续费会员' : '开通会员' }}
            </button>
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
            <button
              @click="showPointsRecharge = true"
              class="points-recharge-btn"
            >
              充值积分
            </button>
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
          <h3 class="modal-subtitle">会员特权</h3>
          <ul class="privileges-list">
            <li class="privilege-item">
              <span class="privilege-check">✓</span>
              <span>VIP使用模型半价（积分）</span>
            </li>
            <li class="privilege-item">
              <span class="privilege-check">✓</span>
              <span>SVIP使用模型免费</span>
            </li>
            <li class="privilege-item">
              <span class="privilege-check">✓</span>
              <span>更多内测功能</span>
            </li>
            <li class="privilege-item">
              <span class="privilege-check">✓</span>
              <span>详见购买会员页面</span>
            </li>
          </ul>
        </div>

        <!-- 购买会员按钮 -->
        <a
          href="https://afdian.com/a/mchyj"
          target="_blank"
          class="purchase-btn vip-purchase-btn"
        >
          购买会员
        </a>

        <!-- 订单号验证区域 -->
        <div class="verification-section">
          <input
            v-model="vipOrderId"
            type="text"
            placeholder="请先在购买会员界面复制订单号，在此粘贴"
            class="verification-input"
          />
          <button
            @click="verifyVipOrder"
            :disabled="verifyingVipOrder"
            class="verification-btn"
          >
            {{ verifyingVipOrder ? '验证中...' : '验证' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 积分充值弹窗 -->
    <div v-if="showPointsRecharge" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">积分充值</h2>
          <button @click="showPointsRecharge = false" class="modal-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" class="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <h3 class="modal-subtitle">积分用途</h3>
          <ul class="privileges-list">
            <li class="privilege-item">
              <span class="privilege-check">✓</span>
              <span>文字转语音、语音转文字（开发中）</span>
            </li>
            <li class="privilege-item">
              <span class="privilege-check">✓</span>
              <span>使用对话模型</span>
            </li>
          </ul>
        </div>

        <!-- 购买积分按钮 -->
        <a
          href="https://afdian.com/a/mchyj?tab=shop"
          target="_blank"
          class="purchase-btn points-purchase-btn"
        >
          购买积分
        </a>

        <!-- 订单号验证区域 -->
        <div class="verification-section">
          <input
            v-model="pointsOrderId"
            type="text"
            placeholder="请先在购买积分界面复制订单号，在此粘贴"
            class="verification-input"
          />
          <button
            @click="verifyPointsOrder"
            :disabled="verifyingPointsOrder"
            class="verification-btn"
          >
            {{ verifyingPointsOrder ? '验证中...' : '验证' }}
          </button>
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
  background-color: var(--color-white);
  color: var(--color-gray-800);
}

.dark .profile-container {
  background-color: var(--color-black);
  color: var(--color-gray-100);
}

.header-container {
  display: flex;
  align-items: center;
  padding: var(--spacing-md); /* p-4 */
  border-bottom: 1px solid var(--color-gray-200); /* border-b border-gray-200 */
}

.dark .header-container {
  border-bottom-color: var(--color-gray-800); /* dark:border-gray-800 */
}

.back-btn {
  padding: var(--spacing-sm); /* p-2 */
  border-radius: var(--border-radius-md); /* rounded-md */
}

.back-btn:hover {
  background-color: var(--color-gray-100); /* hover:bg-gray-100 */
}

.dark .back-btn:hover {
  background-color: var(--color-gray-800); /* dark:hover:bg-gray-800 */
}

.back-btn-icon {
  height: var(--spacing-lg); /* h-5 */
  width: var(--spacing-lg); /* w-5 */
}

.page-title {
  margin-left: var(--spacing-md); /* ml-4 */
  font-size: var(--font-size-xl); /* text-xl */
  font-weight: var(--font-weight-semibold); /* font-semibold */
}

.content-container {
  padding: var(--spacing-lg); /* p-6 */
  max-width: var(--max-width-7xl); /* max-w-4xl */
  margin-left: auto; /* mx-auto */
  margin-right: auto; /* mx-auto */
}

.user-info-card {
  background-color: var(--color-white); /* bg-white */
  border: 1px solid var(--color-gray-200); /* border border-gray-200 */
  border-radius: var(--border-radius-lg); /* rounded-lg */
  padding: var(--spacing-lg); /* p-6 */
  margin-bottom: var(--spacing-lg); /* mb-6 */
}

.dark .user-info-card {
  background-color: var(--color-black); /* dark:bg-black */
  border-color: var(--color-gray-800); /* dark:border-gray-800 */
}

.user-info-content {
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .user-info-content {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--spacing-lg); /* gap-6 */
  }
}

.user-avatar {
  width: 5rem; /* w-20 */
  height: 5rem; /* h-20 */
  border-radius: var(--border-radius-full); /* rounded-full */
  background-color: var(--color-gray-200); /* bg-gray-200 */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xl); /* text-xl */
  font-weight: 700; /* font-bold */
  color: var(--color-gray-600); /* text-gray-700 */
}

.dark .user-avatar {
  background-color: var(--color-gray-700); /* dark:bg-gray-700 */
  color: var(--color-gray-300); /* dark:text-gray-300 */
}

.user-details {
  flex: 1;
  text-align: center;
}

@media (min-width: 768px) {
  .user-details {
    text-align: left; /* md:text-left */
  }
}

.user-name {
  font-size: var(--font-size-2xl); /* text-2xl */
  font-weight: 700; /* font-bold */
}

.user-email {
  color: var(--color-gray-600); /* text-gray-600 */
  margin-top: var(--spacing-xs); /* mt-1 */
}

.dark .user-email {
  color: var(--color-gray-400); /* dark:text-gray-400 */
}

.user-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--spacing-lg); /* gap-6 */
  margin-top: var(--spacing-md); /* mt-4 */
}

@media (min-width: 768px) {
  .user-stats {
    justify-content: flex-start; /* md:justify-start */
  }
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: var(--font-size-sm); /* text-sm */
  color: var(--color-gray-500); /* text-gray-500 */
}

.dark .stat-label {
  color: var(--color-gray-400); /* dark:text-gray-400 */
}

.stat-value {
  font-size: var(--font-size-lg); /* text-lg */
  font-weight: 600; /* font-semibold */
}

.vip-status {
  color: #eab308; /* text-yellow-500 */
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr)); /* grid-cols-1 */
  gap: var(--spacing-md); /* gap-4 */
}

@media (min-width: 768px) {
  .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)); /* md:grid-cols-2 */
  }
}

@media (min-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)); /* lg:grid-cols-3 */
  }
}

.feature-card {
  background-color: var(--color-white); /* bg-white */
  border: 1px solid var(--color-gray-200); /* border border-gray-200 */
  border-radius: var(--border-radius-lg); /* rounded-lg */
  padding: var(--spacing-md); /* p-4 */
}

.dark .feature-card {
  background-color: var(--color-black); /* dark:bg-black */
  border-color: var(--color-gray-800); /* dark:border-gray-800 */
}

.feature-card-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md); /* gap-4 */
}

.feature-icon {
  width: 3rem; /* w-12 */
  height: 3rem; /* h-12 */
  border-radius: var(--border-radius-lg); /* rounded-lg */
  background-color: #dbeafe; /* bg-blue-100 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .feature-icon {
  background-color: rgba(30, 58, 138, 0.3); /* dark:bg-blue-900/30 */
}

.icon {
  height: 1.5rem; /* h-6 */
  width: 1.5rem; /* w-6 */
  color: #3b82f6; /* text-blue-500 */
}

.dark .icon {
  color: #60a5fa; /* dark:text-blue-400 */
}

.feature-text {
  flex: 1;
}

.feature-title {
  font-weight: 500; /* font-semibold */
}

.feature-desc {
  font-size: var(--font-size-sm); /* text-sm */
  color: var(--color-gray-500); /* text-gray-500 */
}

.dark .feature-desc {
  color: var(--color-gray-400); /* dark:text-gray-400 */
}

.sign-in-btn {
  padding: var(--spacing-sm) var(--spacing-md); /* px-4 py-2 */
  border-radius: var(--border-radius-md); /* rounded-md */
  font-size: var(--font-size-sm); /* text-sm */
  font-weight: 500; /* font-medium */
  transition-colors: 150ms;
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
  transition-colors: 150ms;
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
  transition-colors: 150ms;
}

.points-recharge-btn:hover {
  background-color: #059669; /* hover:bg-green-600 */
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5); /* bg-black/50 */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal); /* z-50 */
  padding: var(--spacing-md); /* p-4 */
}

.modal-content {
  background-color: var(--color-white); /* bg-white */
  border: 1px solid var(--color-gray-200); /* border border-gray-200 */
  border-radius: var(--border-radius-lg); /* rounded-lg */
  width: 100%;
  max-width: 28rem; /* max-w-md */
  padding: var(--spacing-lg); /* p-6 */
}

.dark .modal-content {
  background-color: var(--color-black); /* dark:bg-black */
  border-color: var(--color-gray-800); /* dark:border-gray-800 */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md); /* mb-4 */
}

.modal-title {
  font-size: var(--font-size-xl); /* text-xl */
  font-weight: var(--font-weight-semibold); /* font-semibold */
}

.modal-close-btn {
  padding: var(--spacing-xs); /* p-1 */
  border-radius: var(--border-radius-md); /* rounded-md */
}

.modal-close-btn:hover {
  background-color: var(--color-gray-100); /* hover:bg-gray-100 */
}

.dark .modal-close-btn:hover {
  background-color: var(--color-gray-800); /* dark:hover:bg-gray-800 */
}

.modal-close-icon {
  height: var(--spacing-lg); /* h-5 */
  width: var(--spacing-lg); /* w-5 */
}

.modal-body {
  margin-bottom: var(--spacing-lg); /* mb-6 */
}

.modal-subtitle {
  font-weight: 500; /* font-semibold */
  margin-bottom: var(--spacing-sm); /* mb-2 */
}

.privileges-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm); /* space-y-2 */
}

.privilege-item {
  display: flex;
  align-items: flex-start;
  font-size: var(--font-size-sm); /* text-sm */
  color: var(--color-gray-600); /* text-gray-600 */
}

.dark .privilege-item {
  color: var(--color-gray-400); /* dark:text-gray-400 */
}

.privilege-check {
  color: #10b981; /* text-green-500 */
  margin-right: var(--spacing-sm); /* mr-2 */
}

.purchase-btn {
  display: block;
  width: 100%;
  padding: var(--spacing-md) var(--spacing-md); /* px-4 py-3 */
  background-color: #f59e0b; /* bg-amber-500 */
  color: var(--color-white); /* text-white */
  border-radius: var(--border-radius-md); /* rounded-md */
  text-align: center;
  margin-bottom: var(--spacing-md); /* mb-4 */
  font-size: var(--font-size-sm); /* text-sm */
  font-weight: 500; /* font-medium */
  transition-colors: 150ms;
}

.purchase-btn:hover {
  background-color: #d97706; /* hover:bg-amber-600 */
}

.points-purchase-btn {
  background-color: #10b981; /* bg-green-500 */
}

.points-purchase-btn:hover {
  background-color: #059669; /* hover:bg-green-600 */
}

.verification-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md); /* space-y-3 */
}

.verification-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-sm); /* px-3 py-2 */
  border: 1px solid var(--color-gray-300); /* border border-gray-300 */
  border-radius: var(--border-radius-md); /* rounded-md */
  font-size: var(--font-size-sm); /* text-sm */
}

.dark .verification-input {
  background-color: var(--color-black); /* dark:bg-black */
  border-color: var(--color-gray-700); /* dark:border-gray-700 */
}

.verification-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(107, 114, 128, 0.2); /* focus:ring-2 focus:ring-gray-500 */
}

.dark .verification-input:focus {
  box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.2); /* dark:focus:ring-gray-400 */
}

.verification-btn {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md); /* px-4 py-2 */
  background-color: #3b82f6; /* bg-blue-500 */
  color: var(--color-white); /* text-white */
  border-radius: var(--border-radius-md); /* rounded-md */
  font-size: var(--font-size-sm); /* text-sm */
  font-weight: 500; /* font-medium */
  transition-colors: 150ms;
}

.verification-btn:hover {
  background-color: #2563eb; /* hover:bg-blue-600 */
}

.verification-btn:disabled {
  opacity: 0.5; /* disabled:opacity-50 */
}
</style>