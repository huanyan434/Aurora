<template>
  <div class="register-container">
    <div class="register-form-container">
      <div class="register-header">
        <h2 class="register-title">
          注册
        </h2>
      </div>

      <form class="register-form" @submit.prevent="handleRegister">
        <div class="form-fields">
          <div class="form-field">
            <label for="email" class="field-label">
              邮箱
            </label>
            <div class="field-input-container">
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                class="field-input"
                v-model="registerForm.email"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="password" class="field-label">
              密码
            </label>
            <div class="field-input-container">
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="new-password"
                required
                class="field-input"
                v-model="registerForm.password"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="confirmPassword" class="field-label">
              确认密码
            </label>
            <div class="field-input-container">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                class="field-input"
                v-model="registerForm.confirmPassword"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="verifyCode" class="field-label">
              验证码
            </label>
            <div class="verify-code-container">
              <input
                id="verifyCode"
                name="verifyCode"
                type="text"
                required
                class="field-input verify-code-input"
                v-model="registerForm.verifyCode"
              />
              <button
                type="button"
                :disabled="!canSendCode"
                @click="handleSendCode"
                :class="['verify-code-btn', { 'verify-code-btn-disabled': sendingCode }]"
              >
                <span v-if="sendingCode" class="btn-spinner-container">
                  <svg class="btn-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="spinner-head" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                {{ codeButtonText }}
              </button>
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            class="register-btn"
          >
            注册
          </button>
        </div>

        <div class="login-info">
          已有账号？
          <a href="#" @click.prevent="goToLogin" class="login-link">
            登录
          </a>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { signup, sendVerifyCode } from '@/api/user'
import type { SignupRequest, SendVerifyCodeRequest } from '@/api/user'
import { toastError, toastSuccess } from '@/components/ui/toast/use-toast'

const router = useRouter()
const route = useRoute()

const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  verifyCode: ''
})

const countdown = ref(0)
let countdownTimer: number | null = null
const loading = ref(false)
const sendingCode = ref(false)

const canSendCode = computed(() => {
  return registerForm.email && countdown.value === 0 && !sendingCode.value
})

const codeButtonText = computed(() => {
  if (countdown.value > 0) {
    return `${countdown.value}s后重发`
  }
  if (sendingCode.value) {
    return '发送中...'
  }
  return '发送验证码'
})

const handleSendCode = async () => {
  if (!registerForm.email) {
    toastError('请先输入邮箱')
    return
  }

  // 立即禁用按钮并显示加载状态
  sendingCode.value = true

  try {
    const data: SendVerifyCodeRequest = {
      email: registerForm.email
    }

    const response = await sendVerifyCode(data)

    if (response.data.success) {
      toastSuccess('验证码已发送，请查收邮箱')
      // 恢复按钮状态 (停止显示加载状态)
      sendingCode.value = false
      // 开始倒计时
      startCountdown()
    } else {
      toastError(response.data.message || '验证码发送失败')
      // 恢复按钮状态
      sendingCode.value = false
    }
  } catch (error) {
    console.error('发送验证码错误:', error)
    toastError('验证码发送过程中发生错误')
    // 恢复按钮状态
    sendingCode.value = false
  }
}

const startCountdown = () => {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

const handleRegister = async () => {
  // 验证密码确认
  if (registerForm.password !== registerForm.confirmPassword) {
    toastError('两次输入的密码不一致')
    return
  }

  // 验证邮箱是否存在
  if (!registerForm.email) {
    toastError('请输入邮箱')
    return
  }

  loading.value = true

  try {
    const data: SignupRequest = {
      username: registerForm.email.split('@')[0] || 'user', // 使用邮箱前缀作为用户名，如果为空则使用默认值'user'
      email: registerForm.email,
      password: registerForm.password,
      verifyCode: registerForm.verifyCode
    }

    const response = await signup(data)

    if (response.data.success) {
      toastSuccess('注册成功')
      // 注册成功后，检查是否有 redirect 参数
      const redirect = route.query.redirect
      if (redirect) {
        // 解码 redirect 参数并跳转
        const decodedRedirect = decodeURIComponent(redirect as string)
        router.push(decodedRedirect)
      } else {
        // 默认跳转到登录页面
        router.push('/login')
      }
    } else {
      toastError(response.data.message || '注册失败')
    }
  } catch (error) {
    console.error('注册错误:', error)
    toastError('注册过程中发生错误')
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  // 检查当前路由是否有 redirect 参数，如果有则传递给登录页面
  const redirect = route.query.redirect
  if (redirect) {
    // 保持 redirect 参数的编码状态，以便在 URL 中正确传递
    router.push(`/login?redirect=${redirect}`)
  } else {
    router.push('/login')
  }
}

// 组件卸载时清理定时器
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-white); /* bg-white */
  padding: var(--spacing-md); /* p-4 */
}

.dark .register-container {
  background-color: var(--color-black); /* dark:bg-black */
}

.register-form-container {
  width: 100%;
  max-width: 20rem; /* max-w-xs */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl); /* space-y-8 */
}

.register-header {
  text-align: center;
}

.register-title {
  margin-top: var(--spacing-lg); /* mt-6 */
  font-size: var(--font-size-3xl); /* text-3xl */
  font-weight: 700; /* font-bold */
  line-height: 2.25rem; /* tracking-tight */
  color: var(--color-black); /* text-black */
}

.dark .register-title {
  color: var(--color-white); /* dark:text-white */
}

.register-form {
  margin-top: var(--spacing-xl); /* mt-8 */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg); /* space-y-6 */
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md); /* space-y-4 */
}

.form-field {
  /* 空样式块，保留结构 */
}

.field-label {
  display: block;
  font-size: var(--font-size-sm); /* text-sm */
  font-weight: 500; /* font-medium */
  color: var(--color-gray-900); /* text-gray-900 */
}

.dark .field-label {
  color: var(--color-gray-100); /* dark:text-gray-100 */
}

.field-input-container {
  margin-top: var(--spacing-xs); /* mt-1 */
}

.verify-code-container {
  margin-top: var(--spacing-xs); /* mt-1 */
  display: flex;
  gap: var(--spacing-sm); /* space-x-2 */
}

.field-input {
  appearance: none;
  display: block;
  width: 100%;
  padding-left: var(--spacing-sm); /* px-3 */
  padding-right: var(--spacing-sm); /* px-3 */
  padding-top: var(--spacing-sm); /* py-2 */
  padding-bottom: var(--spacing-sm); /* py-2 */
  border: 1px solid #d1d5db; /* border border-gray-300 */
  border-radius: var(--border-radius-md); /* rounded-md */
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
  color: var(--color-gray-500); /* placeholder-gray-400 */
}

.verify-code-input {
  flex: 1; /* flex-1 */
}

.field-input:focus {
  outline: none; /* focus:outline-none */
  border-color: var(--color-black); /* focus:border-black */
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1); /* focus:ring-black */
}

.dark .field-input {
  background-color: var(--color-black); /* dark:bg-black */
  color: var(--color-white); /* dark:text-white */
  border-color: var(--color-gray-700); /* dark:border-gray-700 */
}

.dark .field-input:focus {
  border-color: var(--color-white); /* dark:focus:border-white */
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1); /* dark:focus:ring-white */
}

.field-input::placeholder {
  color: var(--color-gray-400); /* placeholder-gray-400 */
}

.verify-code-btn {
  padding-left: var(--spacing-sm); /* px-3 */
  padding-right: var(--spacing-sm); /* px-3 */
  padding-top: var(--spacing-sm); /* py-2 */
  padding-bottom: var(--spacing-sm); /* py-2 */
  border: 1px solid #d1d5db; /* border border-gray-300 */
  border-radius: var(--border-radius-md); /* rounded-md */
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
  font-size: var(--font-size-sm); /* text-sm */
  font-weight: 500; /* font-medium */
  color: var(--color-black); /* text-black */
  background-color: var(--color-white); /* bg-white */
  display: flex;
  align-items: center;
  justify-content: center;
}

.verify-code-btn:hover:not(:disabled) {
  background-color: var(--color-gray-50); /* hover:bg-gray-50 */
}

.dark .verify-code-btn {
  color: var(--color-white); /* dark:text-white */
  background-color: var(--color-black); /* dark:bg-black */
}

.dark .verify-code-btn:hover:not(:disabled) {
  background-color: var(--color-gray-900); /* dark:hover:bg-gray-900 */
}

.verify-code-btn:focus {
  outline: none; /* focus:outline-none */
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 4px rgba(0, 0, 0, 0.1); /* focus:ring-2 focus:ring-offset-2 focus:ring-black */
}

.dark .verify-code-btn:focus {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 1), 0 0 0 4px rgba(255, 255, 255, 0.1); /* dark:focus:ring-white */
}

.verify-code-btn:disabled {
  opacity: 0.5; /* disabled:opacity-50 */
}

.verify-code-btn-disabled {
  opacity: 0.75; /* opacity-75 */
  cursor: not-allowed; /* cursor-not-allowed */
}

.btn-spinner-container {
  margin-right: var(--spacing-xs); /* mr-1 */
}

.btn-spinner {
  height: var(--spacing-md); /* h-4 */
  width: var(--spacing-md); /* w-4 */
  animation: spin 1s linear infinite; /* animate-spin */
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner-track {
  opacity: 0.25; /* opacity-25 */
}

.spinner-head {
  opacity: 0.75; /* opacity-75 */
}

.register-btn {
  width: 100%; /* w-full */
  display: flex;
  justify-content: center;
  padding-top: var(--spacing-sm); /* py-2 */
  padding-bottom: var(--spacing-sm); /* py-2 */
  padding-left: var(--spacing-md); /* px-4 */
  padding-right: var(--spacing-md); /* px-4 */
  border: 1px solid transparent; /* border border-transparent */
  border-radius: var(--border-radius-md); /* rounded-md */
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
  font-size: var(--font-size-sm); /* text-sm */
  font-weight: 500; /* font-medium */
  color: var(--color-white); /* text-white */
  background-color: var(--color-black); /* bg-black */
}

.register-btn:hover:not(:disabled) {
  background-color: var(--color-gray-800); /* hover:bg-gray-800 */
}

.dark .register-btn {
  color: var(--color-black); /* dark:text-black */
  background-color: var(--color-white); /* dark:bg-white */
}

.dark .register-btn:hover:not(:disabled) {
  background-color: var(--color-gray-200); /* dark:hover:bg-gray-200 */
}

.register-btn:focus {
  outline: none; /* focus:outline-none */
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 4px rgba(0, 0, 0, 0.1); /* focus:ring-2 focus:ring-offset-2 focus:ring-black */
}

.dark .register-btn:focus {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 1), 0 0 0 4px rgba(255, 255, 255, 0.1); /* dark:focus:ring-white */
}

.login-info {
  font-size: var(--font-size-sm); /* text-sm */
  text-align: center; /* text-center */
  color: var(--color-gray-600); /* text-gray-600 */
}

.dark .login-info {
  color: var(--color-gray-400); /* dark:text-gray-400 */
}

.login-link {
  font-weight: 500; /* font-medium */
  color: var(--color-black); /* text-black */
}

.login-link:hover {
  color: var(--color-gray-600); /* hover:text-gray-800 */
}

.dark .login-link {
  color: var(--color-white); /* dark:text-white */
}

.dark .login-link:hover {
  color: var(--color-gray-300); /* dark:hover:text-gray-300 */
}
</style>