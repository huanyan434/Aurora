<template>
  <div class="login-container">
    <div class="login-card animate-fade-in">
      <img src="/icon.png" alt="Aurora" class="login-logo" />
      <h1 class="login-title">Aurora</h1>
      <p class="login-subtitle">管理后台</p>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="password" class="form-label">管理密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="form-input"
            placeholder="请输入管理密码"
          />
        </div>

        <div v-if="error" class="error-message">
          <span>⚠️</span>
          {{ error }}
        </div>

        <button type="submit" :disabled="loading" class="submit-btn">
          <span v-if="loading" class="spinner"></span>
          <span v-else>登 录</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { dashboardApi } from '@/api/dashboard'

const router = useRouter()
const userStore = useUserStore()

const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!password.value) {
    error.value = '请输入管理密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const response = await dashboardApi.login({
      password: password.value
    })

    if (response.data.success) {
      userStore.setUser({
        id: '1',
        username: 'Admin',
        email: 'admin@wanyim.cn',
        isMember: true,
        memberLevel: 'SVIP',
        points: 999999
      })
      router.push('/dashboard/overview')
    } else {
      error.value = response.data.message || '管理密码错误'
      loading.value = false
    }
  } catch (err) {
    error.value = '登录失败，请检查网络连接'
    console.error(err)
    loading.value = false
  }
}
</script>

<style scoped>
/* 登录页面样式 */
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  border: 1px solid #e4e4e7;
}

.login-logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: 20px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
  display: block;
}

.login-title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.login-subtitle {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 32px;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.2s;
  background: #fafafa;
}

.form-input:focus {
  outline: none;
  border-color: #18181b;
  background: white;
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.05);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: #18181b;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:hover {
  background: #27272a;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
}

.submit-btn:active {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.submit-btn .spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
