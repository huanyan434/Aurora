<template>
  <div class="profile-page">
    <div class="profile-shell">
      <header class="profile-hero">
        <div class="hero-copy">
          <div class="hero-title-row">
            <button @click="goBack" class="back-btn back-btn-inline" aria-label="返回">
              <svg xmlns="http://www.w3.org/2000/svg" class="back-btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div class="hero-badge">个人中心</div>
          </div>
          <h1 class="hero-title">欢迎回来，{{ userInfo?.username || '用户' }}</h1>
          <p class="hero-description">在这里管理你的账号信息、会员权益、积分状态和签到记录。</p>
        </div>
      </header>

      <main class="profile-grid">
        <section class="profile-card profile-summary-card">
          <div class="summary-top">
            <div class="user-avatar user-avatar-lg">
              <img v-if="userInfo?.avatar" :src="avatarSrc" class="avatar-image" alt="用户头像" />
              <span v-else>{{ userInfo?.username?.charAt(0).toUpperCase() || 'U' }}</span>
            </div>
            <div class="summary-copy">
              <div class="summary-tag">账户概览</div>
              <h2 class="user-name">{{ userInfo?.username || '用户' }}</h2>
              <p class="user-email">{{ userInfo?.email || '未设置邮箱' }}</p>
              <div class="status-row">
                <span class="status-pill" :class="{ 'status-pill-member': userInfo?.isMember }">
                  {{ getMemberLevelText(userInfo?.memberLevel) }}
                </span>
                <span class="status-pill status-pill-muted">
                  {{ signInStatus ? '今日已签到' : '今日未签到' }}
                </span>
              </div>
            </div>
          </div>

          <div class="summary-metrics">
            <button class="metric-card metric-card-clickable" @click="showPointsRecordsDialog">
              <span class="metric-label">可用积分</span>
              <span class="metric-value">{{ userInfo?.points || 0 }}</span>
              <span class="metric-hint">点击查看积分记录</span>
            </button>
            <div class="metric-card">
              <span class="metric-label">签到状态</span>
              <span class="metric-value metric-value-soft">{{ signInStatus ? '已签到' : '待签到' }}</span>
              <span class="metric-hint">每日签到可获得积分</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">账号等级</span>
              <span class="metric-value metric-value-soft">{{ getMemberLevelText(userInfo?.memberLevel) }}</span>
              <span class="metric-hint">不同等级享有不同权益</span>
            </div>
          </div>
        </section>

        <section class="profile-card profile-actions-card">
          <div class="section-header">
            <div>
              <div class="section-kicker">快捷操作</div>
              <h3 class="section-title">常用功能</h3>
            </div>
          </div>

          <div class="action-list">
            <button class="action-item" :disabled="signInStatus || signingIn" @click="handleSignIn">
              <div class="action-icon action-icon-primary">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="action-content">
                <h4>每日签到</h4>
                <p>{{ signInStatus ? '今日已完成签到' : '点击签到获取积分奖励' }}</p>
              </div>
              <span class="action-cta">{{ signingIn ? '签到中...' : (signInStatus ? '已签到' : '去签到') }}</span>
            </button>

            <button class="action-item" @click="showVipUpgrade = true">
              <div class="action-icon action-icon-warm">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div class="action-content">
                <h4>会员开通</h4>
                <p>解锁更低的模型消耗和更多权益</p>
              </div>
              <span class="action-cta">{{ userInfo?.isMember ? '续费会员' : '开通会员' }}</span>
            </button>

            <button class="action-item" @click="showPointsRecharge = true">
              <div class="action-icon action-icon-emerald">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="action-content">
                <h4>积分充值</h4>
                <p>补充积分，解锁更多对话与功能</p>
              </div>
              <span class="action-cta">立即充值</span>
            </button>
          </div>
        </section>

        <section class="profile-card profile-panel-card">
          <div class="section-header">
            <div>
              <div class="section-kicker">外观设置</div>
              <h3 class="section-title">深色模式</h3>
            </div>
          </div>

          <div class="theme-setting-row">
            <div class="theme-setting-copy">
              <h4 class="theme-setting-title">夜间主题</h4>
              <p class="theme-setting-desc">开启后，界面会切换到深色模式。</p>
            </div>
            <Switch v-model="darkMode" />
          </div>
        </section>

        <section class="profile-card profile-panel-card">
          <div class="section-header">
            <div>
              <div class="section-kicker">账户安全</div>
              <h3 class="section-title">状态说明</h3>
            </div>
          </div>

          <div class="info-stack">
            <div class="info-row">
              <span class="info-label">邮箱</span>
              <span class="info-value">{{ userInfo?.email || '未设置邮箱' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">会员状态</span>
              <span class="info-value" :class="{ 'vip-status': userInfo?.isMember }">{{ getMemberLevelText(userInfo?.memberLevel) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">签到</span>
              <span class="info-value">{{ signInStatus ? '今日已签到' : '可签到领取积分' }}</span>
            </div>
          </div>
        </section>
      </main>
    </div>

    <div v-if="showVipUpgrade" class="modal-overlay" @click.self="showVipUpgrade = false">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">会员开通</h2>
            <p class="modal-subtitle">选择适合你的会员方案，享受更低积分消耗与更多权益。</p>
          </div>
          <button @click="showVipUpgrade = false" class="modal-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" class="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="pricing-section">
            <div class="pricing-plans-container">
              <div class="pricing-plan">
                <div class="plan-topline">
                  <span class="plan-badge plan-badge-vip">VIP</span>
                  <span class="plan-duration">月卡</span>
                </div>
                <div class="plan-header">
                  <span class="plan-name">月VIP</span>
                  <span class="plan-price">￥5.00</span>
                </div>
                <ul class="plan-features">
                  <li>VIP使用模型半价（积分）</li>
                  <li>更多内测功能</li>
                </ul>
                <div class="plan-action-container">
                  <a href="https://ifdian.net/a/mchyj" target="_blank" rel="noreferrer" class="plan-payment-link">
                    <Button variant="outline" size="sm" class="plan-action-btn">前往支付</Button>
                  </a>
                </div>
              </div>

              <div class="pricing-plan">
                <div class="plan-topline">
                  <span class="plan-badge plan-badge-vip">VIP</span>
                  <span class="plan-duration">季卡</span>
                </div>
                <div class="plan-header">
                  <span class="plan-name">季VIP</span>
                  <span class="plan-price">￥15.00</span>
                </div>
                <ul class="plan-features">
                  <li>VIP使用模型半价（积分）</li>
                  <li>更多内测功能</li>
                </ul>
                <div class="plan-action-container">
                  <a href="https://ifdian.net/a/mchyj" target="_blank" rel="noreferrer" class="plan-payment-link">
                    <Button variant="outline" size="sm" class="plan-action-btn">前往支付</Button>
                  </a>
                </div>
              </div>

              <div class="pricing-plan pricing-plan-featured">
                <div class="plan-topline">
                  <span class="plan-badge plan-badge-featured">推荐</span>
                  <span class="plan-duration">年卡</span>
                </div>
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
                  <a href="https://ifdian.net/a/mchyj" target="_blank" rel="noreferrer" class="plan-payment-link">
                    <Button variant="outline" size="sm" class="plan-action-btn">前往支付</Button>
                  </a>
                </div>
              </div>

              <div class="pricing-plan">
                <div class="plan-topline">
                  <span class="plan-badge plan-badge-svip">SVIP</span>
                  <span class="plan-duration">月卡</span>
                </div>
                <div class="plan-header">
                  <span class="plan-name">月SVIP</span>
                  <span class="plan-price">￥10.00</span>
                </div>
                <ul class="plan-features">
                  <li>SVIP使用模型免费</li>
                  <li>更多内测功能</li>
                </ul>
                <div class="plan-action-container">
                  <a href="https://ifdian.net/a/mchyj" target="_blank" rel="noreferrer" class="plan-payment-link">
                    <Button variant="outline" size="sm" class="plan-action-btn">前往支付</Button>
                  </a>
                </div>
              </div>

              <div class="pricing-plan">
                <div class="plan-topline">
                  <span class="plan-badge plan-badge-svip">SVIP</span>
                  <span class="plan-duration">季卡</span>
                </div>
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
                  <a href="https://ifdian.net/a/mchyj" target="_blank" rel="noreferrer" class="plan-payment-link">
                    <Button variant="outline" size="sm" class="plan-action-btn">前往支付</Button>
                  </a>
                </div>
              </div>

              <div class="pricing-plan pricing-plan-featured">
                <div class="plan-topline">
                  <span class="plan-badge plan-badge-svip">SVIP</span>
                  <span class="plan-duration">年卡</span>
                </div>
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
                  <a href="https://ifdian.net/a/mchyj" target="_blank" rel="noreferrer" class="plan-payment-link">
                    <Button variant="outline" size="sm" class="plan-action-btn">前往支付</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="verification-section">
          <div class="verification-input-group">
            <input
              v-model="vipOrderId"
              type="text"
              placeholder="请粘贴会员订单号"
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

    <div v-if="showPointsRecharge" class="modal-overlay" @click.self="showPointsRecharge = false">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">积分充值</h2>
            <p class="modal-subtitle">为账户补充积分，解锁更多对话能力与功能权限。</p>
          </div>
          <button @click="showPointsRecharge = false" class="modal-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" class="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="pricing-section">
            <div class="pricing-plans-container">
              <div class="pricing-plan pricing-plan-featured">
                <div class="plan-topline">
                  <span class="plan-badge plan-badge-points">积分</span>
                  <span class="plan-duration">单次充值</span>
                </div>
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
                  <a href="https://ifdian.net/a/mchyj?tab=shop" target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" class="plan-action-btn">前往支付</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="verification-section">
          <div class="verification-input-group">
            <input
              v-model="pointsOrderId"
              type="text"
              placeholder="请粘贴积分订单号"
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

    <div v-if="showPointsRecords" class="modal-overlay" @click.self="showPointsRecords = false">
      <div class="modal-content modal-medium">
        <div class="modal-header">
          <div>
            <h2 class="modal-title">积分记录</h2>
            <p class="modal-subtitle">查看近期积分变动，方便了解签到、充值和消耗情况。</p>
          </div>
          <button @click="showPointsRecords = false" class="modal-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" class="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="loadingPointsRecords" class="state-box">正在加载积分记录...</div>
          <div v-else-if="pointsRecords.length === 0" class="state-box">暂无积分记录</div>
          <div v-else class="records-list">
            <div v-for="(record, index) in pointsRecords" :key="index" class="record-item">
              <div class="record-info">
                <div class="record-description">{{ record.reason }}</div>
                <div class="record-time">{{ formatTimestamp(record.timestamp) }}</div>
              </div>
              <div class="record-amount" :class="{ positive: record.amount > 0, negative: record.amount < 0 }">
                {{ record.amount > 0 ? '+' : '' }}{{ record.amount }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useSettingsStore } from '@/stores/settings';
import { sign, verifyPoints, verifyVip, getHasSigned, getPointsRecords } from '@/api/user';
import type { PointsRecord } from '@/api/user';
import { toastSuccess, toastError } from '@/components/ui/toast/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const router = useRouter();
const userStore = useUserStore();
const settingsStore = useSettingsStore();

const applyDarkMode = (enabled: boolean) => {
  if (enabled) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const darkMode = ref(false);
const signInStatus = ref(false);
const signingIn = ref(false);
const showVipUpgrade = ref(false);
const showPointsRecharge = ref(false);
const showPointsRecords = ref(false);
const vipOrderId = ref('');
const pointsOrderId = ref('');
const verifyingVipOrder = ref(false);
const verifyingPointsOrder = ref(false);
const pointsRecords = ref<PointsRecord[]>([]);
const loadingPointsRecords = ref(false);

const userInfo = computed(() => userStore.userInfo);
const avatarSrc = computed(() => userInfo.value.avatar || '')

const goBack = () => {
  router.go(-1);
};

const getMemberLevelText = (memberLevel: string | undefined) => {
  if (!memberLevel || memberLevel === 'free') {
    return '普通用户';
  }
  return memberLevel + '用户';
};

const handleSignIn = async () => {
  signingIn.value = true;
  try {
    const result = await sign();
    if (result.data.success) {
      signInStatus.value = true;
      const points = result.data.data?.points || 0;
      const consecutiveDays = result.data.data?.consecutive_days || 0;
      const hasExtraReward = result.data.data?.has_extra_reward || false;
      const multiplier = result.data.data?.multiplier || 1;

      let message = `签到成功！获得 ${points} 积分`;
      if (hasExtraReward && multiplier > 1) {
        let multiplierText = '';
        switch (multiplier) {
          case 2:
            multiplierText = '2倍';
            break;
          case 3:
            multiplierText = '3倍';
            break;
          case 4:
            multiplierText = '4倍';
            break;
          default:
            multiplierText = `${multiplier}倍`;
        }
        message += `\n连续签到 ${consecutiveDays} 天，获得${multiplierText}奖励！`;
      }

      toastSuccess(message);
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

const fetchPointsRecords = async () => {
  loadingPointsRecords.value = true;
  try {
    const result = await getPointsRecords();
    if (result.data.success) {
      pointsRecords.value = (result.data.data || []).sort((a: PointsRecord, b: PointsRecord) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    } else {
      toastError(result.data.message || '获取积分记录失败');
    }
  } catch (error) {
    console.error('获取积分记录失败:', error);
    toastError('获取积分记录失败');
  } finally {
    loadingPointsRecords.value = false;
  }
};

const showPointsRecordsDialog = async () => {
  await fetchPointsRecords();
  showPointsRecords.value = true;
};

const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (targetDate.getTime() === today.getTime()) {
    return `今天 ${hours}:${minutes}`;
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return `昨天 ${hours}:${minutes}`;
  } else {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (year === now.getFullYear()) {
      return `${month}-${day}`;
    } else {
      return `${year}-${month}-${day}`;
    }
  }
};

onMounted(async () => {
  const darkModeSetting = settingsStore.getSetting('darkMode');
  darkMode.value = !!darkModeSetting;
  applyDarkMode(darkMode.value);

  await userStore.init();
  await checkSignInStatus();
});

watch(darkMode, (enabled) => {
  settingsStore.setSetting('darkMode', enabled);
  applyDarkMode(enabled);
});
</script>

<style scoped>
.hero-title-row {
  display: flex;
  align-items: center;
}

.theme-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 1rem;
  background: rgba(248, 250, 252, 0.72);
}

.dark .theme-setting-row {
  background: rgba(15, 23, 42, 0.55);
  border-color: rgba(148, 163, 184, 0.14);
}

.theme-setting-copy {
  min-width: 0;
}

.theme-setting-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
  color: #0f172a;
}

.dark .theme-setting-title {
  color: #f8fafc;
}

.theme-setting-desc {
  margin: 0.25rem 0 0;
  font-size: 0.88rem;
  color: #64748b;
}

.dark .theme-setting-desc {
  color: #94a3b8;
}

.profile-page {
  height: 100dvh;
  overflow-x: hidden;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 30%),
    radial-gradient(circle at top right, rgba(168, 85, 247, 0.12), transparent 26%),
    linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%);
  color: var(--color-slate-800);
  padding: 1rem;
}

.dark .profile-page {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 30%),
    radial-gradient(circle at top right, rgba(168, 85, 247, 0.12), transparent 26%),
    linear-gradient(180deg, #020617 0%, #0f172a 100%);
  color: var(--color-slate-100);
}

.profile-shell {
  max-width: 72rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-hero {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 1.35rem;
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(14px);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
  padding: 1.1rem 1.15rem;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.9rem;
  align-items: center;
}

.dark .profile-hero {
  background: rgba(15, 23, 42, 0.72);
  border-color: rgba(148, 163, 184, 0.16);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
}

.profile-hero::after {
  content: '';
  position: absolute;
  inset: auto -8rem -8rem auto;
  width: 14rem;
  height: 14rem;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.14), transparent 65%);
  pointer-events: none;
}

.back-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.76);
  color: var(--color-slate-700);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 1;
  margin-right: 0.5rem;
}

.back-btn:hover {
  transform: translateX(-2px);
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(255, 255, 255, 0.95);
}

.dark .back-btn {
  background: rgba(15, 23, 42, 0.8);
  color: var(--color-slate-200);
  border-color: rgba(148, 163, 184, 0.16);
}

.dark .back-btn:hover {
  background: rgba(30, 41, 59, 0.95);
}

.back-btn-icon {
  width: 1.05rem;
  height: 1.05rem;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  z-index: 1;
}

.hero-badge,
.section-kicker,
.summary-tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0.3rem 0.65rem;
  border-radius: 9999px;
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.dark .hero-badge,
.dark .section-kicker,
.dark .summary-tag {
  background: rgba(59, 130, 246, 0.18);
  color: #93c5fd;
}

.hero-title {
  margin: 0;
  font-size: clamp(1.45rem, 2.2vw, 2.1rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.hero-description {
  margin: 0;
  max-width: 42rem;
  color: #64748b;
  line-height: 1.65;
  font-size: 0.96rem;
}

.dark .hero-description {
  color: #94a3b8;
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.9fr);
  grid-template-rows: auto auto;
  gap: 0.9rem;
}

.profile-card {
  min-height: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-radius: 1.35rem;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}

.dark .profile-card {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(148, 163, 184, 0.14);
}

.profile-summary-card {
  grid-column: 1 / 2;
  grid-row: 1 / 2;
  padding: 1.1rem;
  min-height: 0;
  overflow: auto;
}

.summary-top {
  display: flex;
  gap: 0.9rem;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.user-avatar {
  flex-shrink: 0;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1d4ed8;
  overflow: hidden;
}

.user-avatar-lg {
  width: 4.4rem;
  height: 4.4rem;
  font-size: 1.4rem;
  border: 2px solid rgba(59, 130, 246, 0.16);
}

.dark .user-avatar {
  background: linear-gradient(135deg, #1e3a8a, #312e81);
  color: #dbeafe;
  border-color: rgba(59, 130, 246, 0.22);
}

.summary-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.user-name {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.user-email {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.dark .user-email {
  color: #94a3b8;
}

.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.4rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.7rem;
  border-radius: 9999px;
  background: rgba(226, 232, 240, 0.85);
  color: #334155;
  font-size: 0.76rem;
  font-weight: 600;
}

.dark .status-pill {
  background: rgba(51, 65, 85, 0.9);
  color: #cbd5e1;
}

.status-pill-member {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.dark .status-pill-member {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
}

.status-pill-muted {
  background: rgba(59, 130, 246, 0.08);
  color: #2563eb;
}

.dark .status-pill-muted {
  background: rgba(59, 130, 246, 0.16);
  color: #93c5fd;
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.9rem;
}

.metric-card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(255, 255, 255, 0.95));
  border-radius: 1rem;
  padding: 0.85rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.dark .metric-card {
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.92));
  border-color: rgba(148, 163, 184, 0.12);
}

.metric-card-clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.metric-card-clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.06);
}

.metric-value-soft {
  font-size: 1.05rem;
}

.metric-hint {
  color: #2563eb;
  font-size: 0.9rem;
}

.dark .metric-hint {
  color: #93c5fd;
}

.profile-actions-card,
.profile-panel-card {
  padding: 1.05rem;
  min-height: 0;
  overflow: auto;
}

.profile-actions-card {
  grid-column: 2 / 3;
  grid-row: 1 / span 2;
}

.profile-panel-card {
  grid-column: 1 / 2;
  grid-row: 2 / 3;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.85rem;
}

.section-title {
  margin: 0.5rem 0.5rem 0;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-item {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(248, 250, 252, 0.9);
  border-radius: 1rem;
  padding: 0.85rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-item:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.22);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
}

.action-item:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.dark .action-item {
  background: rgba(15, 23, 42, 0.9);
  border-color: rgba(148, 163, 184, 0.1);
}

.action-icon {
  width: 2.7rem;
  height: 2.7rem;
  border-radius: 0.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.action-icon-primary {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.action-icon-warm {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.action-icon-emerald {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.dark .action-icon-primary {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.dark .action-icon-warm {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
}

.dark .action-icon-emerald {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
}

.action-content h4 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
}

.action-content p {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.83rem;
  line-height: 1.45;
}

.dark .action-content p {
  color: #94a3b8;
}

.action-cta {
  color: #2563eb;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.dark .action-cta {
  color: #93c5fd;
}

.info-stack {
  display: grid;
  gap: 0.65rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 0.9rem;
  border-radius: 0.95rem;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.dark .info-row {
  background: rgba(15, 23, 42, 0.9);
  border-color: rgba(148, 163, 184, 0.1);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.modal-content {
  width: 100%;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 1.35rem;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.22);
  animation: modalIn 0.2s ease-out;
}

.modal-large {
  max-width: 68rem;
  max-height: 86vh;
}

.modal-medium {
  max-width: 48rem;
  max-height: 78vh;
}

.dark .modal-content {
  background: rgba(15, 23, 42, 0.96);
  border-color: rgba(148, 163, 184, 0.14);
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.1rem 1.15rem 0.9rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.modal-body {
  padding: 1rem 1.15rem 0.45rem;
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
}

.modal-subtitle {
  margin: 0.3rem 0 0;
  color: #64748b;
  line-height: 1.55;
  font-size: 0.88rem;
}

.dark .modal-subtitle {
  color: #94a3b8;
}

.modal-close-btn {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 9999px;
  border: none;
  background: rgba(148, 163, 184, 0.12);
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.dark .modal-close-btn {
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.12);
}

.modal-close-icon {
  width: 1.05rem;
  height: 1.05rem;
}

.pricing-section {
  padding-bottom: 0.9rem;
}

.pricing-plans-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.9rem;
}

.pricing-plan {
  position: relative;
  overflow: hidden;
  border-radius: 1.15rem;
  padding: 0.95rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.98));
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.dark .pricing-plan {
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98));
  border-color: rgba(148, 163, 184, 0.12);
}

.pricing-plan-featured {
  border-color: rgba(59, 130, 246, 0.22);
  box-shadow: 0 12px 28px rgba(59, 130, 246, 0.06);
}

.plan-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.65rem;
}

.plan-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.28rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
}

.plan-badge-vip {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.plan-badge-svip {
  background: rgba(168, 85, 247, 0.12);
  color: #7c3aed;
}

.plan-badge-points {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.plan-badge-featured {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.dark .plan-badge-vip {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
}

.dark .plan-badge-svip {
  background: rgba(168, 85, 247, 0.18);
  color: #d8b4fe;
}

.dark .plan-badge-points {
  background: rgba(16, 185, 129, 0.18);
  color: #6ee7b7;
}

.dark .plan-badge-featured {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.plan-name {
  font-size: 1.02rem;
  font-weight: 800;
}

.plan-price {
  font-size: 1.5rem;
  font-weight: 900;
  line-height: 1;
}

.plan-original-price {
  font-size: 0.9rem;
  color: #94a3b8;
  text-decoration: line-through;
  text-align: right;
}

.plan-duration {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 600;
}

.plan-features {
  list-style: none;
  margin: 0.8rem 0 0.95rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.plan-features li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: #475569;
  font-size: 0.86rem;
  line-height: 1.5;
}

.dark .plan-features li {
  color: #cbd5e1;
}

.plan-features li::before {
  content: '✓';
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
  font-size: 0.68rem;
  font-weight: 800;
  margin-top: 0.12rem;
}

.dark .plan-features li::before {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.plan-action-container {
  display: flex;
  justify-content: flex-end;
}

.plan-payment-link {
  display: inline-flex;
  color: inherit;
  text-decoration: none;
}

.plan-payment-link:hover {
  color: inherit;
  text-decoration: none;
}

.plan-action-btn {
  width: 100%;
}

.verification-section {
  padding: 0 1.15rem 1.15rem;
}

.verification-input-group {
  display: flex;
  gap: 0.65rem;
  align-items: center;
}

.verification-input {
  flex: 1;
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 0.95rem;
  padding: 0.78rem 0.9rem;
  background: rgba(248, 250, 252, 0.95);
  color: var(--color-slate-800);
  outline: none;
  transition: all 0.2s ease;
}

.verification-input:focus {
  border-color: rgba(59, 130, 246, 0.45);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.dark .verification-input {
  background: rgba(15, 23, 42, 0.96);
  color: var(--color-slate-100);
  border-color: rgba(148, 163, 184, 0.14);
}

.state-box {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  border-radius: 1rem;
  background: rgba(248, 250, 252, 0.92);
  border: 1px dashed rgba(148, 163, 184, 0.18);
}

.dark .state-box {
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.9);
  border-color: rgba(148, 163, 184, 0.14);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  max-height: 420px;
  overflow-y: auto;
  padding-bottom: 0.65rem;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 0.95rem;
  border-radius: 0.95rem;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(248, 250, 252, 0.95);
}

.dark .record-item {
  background: rgba(15, 23, 42, 0.9);
  border-color: rgba(148, 163, 184, 0.1);
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.record-description {
  font-weight: 700;
  color: var(--color-slate-800);
}

.dark .record-description {
  color: var(--color-slate-100);
}

.record-time {
  font-size: 0.82rem;
  color: #64748b;
}

.dark .record-time {
  color: #94a3b8;
}

.record-amount {
  font-weight: 900;
  font-size: 1rem;
}

.positive {
  color: #059669;
}

.negative {
  color: #dc2626;
}

.dark .positive {
  color: #34d399;
}

.dark .negative {
  color: #f87171;
}

@media (max-width: 1100px) {
  .profile-hero {
    grid-template-columns: 1fr;
  }

  .profile-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .profile-summary-card,
  .profile-actions-card,
  .profile-panel-card {
    grid-column: auto;
    grid-row: auto;
    overflow: visible;
  }

  .profile-actions-card {
    grid-column: auto;
    grid-row: auto;
  }
}

@media (max-width: 720px) {
  .profile-page {
    min-height: 100vh;
    overflow-y: auto;
    padding: 0.85rem;
  }

  .profile-shell {
    gap: 0.85rem;
    min-height: calc(100vh - 1.7rem);
  }

  .profile-hero,
  .profile-card,
  .modal-header,
  .modal-body,
  .verification-section {
    padding-left: 0.95rem;
    padding-right: 0.95rem;
  }

  .summary-metrics,
  .verification-input-group {
    grid-template-columns: 1fr;
    display: grid;
  }

  .action-item,
  .record-item,
  .summary-top {
    grid-template-columns: 1fr;
    display: grid;
    justify-items: start;
  }

  .action-cta {
    justify-self: start;
  }

  .verification-input-group {
    gap: 0.55rem;
  }

  .plan-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .plan-action-container {
    justify-content: stretch;
  }
}
</style>
