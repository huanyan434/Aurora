<template>
  <div class="login-container">
    <div class="login-form-container">
      <div class="login-header">
        <h2 class="login-title">
          登录
        </h2>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
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
                v-model="loginForm.email"
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
                autocomplete="current-password"
                required
                class="field-input"
                v-model="loginForm.password"
              />
            </div>
          </div>
        </div>

        <div class="password-forgot-container">
          <div class="forgot-password">
            <a href="#" class="forgot-password-link">
              忘记密码？
            </a>
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="login-button"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </div>

        <div class="register-info">
          还没有账号？
          <a href="#" @click.prevent="goToRegister" class="register-link">
            注册
          </a>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { login } from '@/api/user'
import type { LoginRequest } from '@/api/user'
import { toastError } from '@/components/ui/toast/use-toast'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginForm = ref({
  email: '',
  password: ''
})

const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  try {
    const data: LoginRequest = {
      email: loginForm.value.email,
      password: loginForm.value.password
    }

    const response = await login(data)

    if (response.data.success) {
      // 登录成功后获取用户信息
      await userStore.init()

      // 检查是否有 redirect 参数
      const redirect = route.query.redirect
      if (redirect) {
        // 解码 redirect 参数并跳转
        const decodedRedirect = decodeURIComponent(redirect as string)
        router.push(decodedRedirect)
      } else {
        // 默认跳转到首页
        router.push('/')
      }
    } else {
      // 处理登录失败
      toastError(response.data.message || '登录失败')
    }
  } catch (error) {
    console.error('登录错误:', error)
    toastError('登录过程中发生错误')
  } finally {
    loading.value = false
  }
}

const goToRegister = () => {
  // 检查当前路由是否有 redirect 参数，如果有则传递给注册页面
  const redirect = route.query.redirect
  if (redirect) {
    // 保持 redirect 参数的编码状态，以便在 URL 中正确传递
    router.push(`/register?redirect=${redirect}`)
  } else {
    router.push('/register')
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-white); /* bg-white */
  padding: var(--spacing-md); /* p-4 */
}

.dark .login-container {
  background-color: var(--color-black); /* dark:bg-black */
}

.login-form-container {
  width: 100%;
  max-width: 20rem; /* max-w-xs */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl); /* space-y-8 */
}

.login-header {
  text-align: center;
}

.login-title {
  margin-top: var(--spacing-lg); /* mt-6 */
  font-size: var(--font-size-3xl); /* text-3xl */
  font-weight: 700; /* font-bold */
  line-height: 2.25rem; /* tracking-tight */
  color: var(--color-black); /* text-black */
}

.dark .login-title {
  color: var(--color-white); /* dark:text-white */
}

.login-form {
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

.password-forgot-container {
  display: flex;
  align-items: center;
  justify-content: space-between; /* justify-between */
}

.forgot-password {
  font-size: var(--font-size-sm); /* text-sm */
}

.forgot-password-link {
  font-weight: 500; /* font-medium */
  color: var(--color-black); /* text-black */
}

.forgot-password-link:hover {
  color: var(--color-gray-600); /* hover:text-gray-800 */
}

.dark .forgot-password-link {
  color: var(--color-white); /* dark:text-white */
}

.dark .forgot-password-link:hover {
  color: var(--color-gray-300); /* dark:hover:text-gray-300 */
}

.login-button {
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

.login-button:hover:not(:disabled) {
  background-color: var(--color-gray-800); /* hover:bg-gray-800 */
}

.dark .login-button {
  color: var(--color-black); /* dark:text-black */
  background-color: var(--color-white); /* dark:bg-white */
}

.dark .login-button:hover:not(:disabled) {
  background-color: var(--color-gray-200); /* dark:hover:bg-gray-200 */
}

.login-button:focus {
  outline: none; /* focus:outline-none */
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 4px rgba(0, 0, 0, 0.1); /* focus:ring-2 focus:ring-offset-2 focus:ring-black */
}

.dark .login-button:focus {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 1), 0 0 0 4px rgba(255, 255, 255, 0.1); /* dark:focus:ring-white */
}

.login-button:disabled {
  opacity: 0.5; /* disabled:opacity-50 */
}

.register-info {
  font-size: var(--font-size-sm); /* text-sm */
  text-align: center; /* text-center */
  color: var(--color-gray-600); /* text-gray-600 */
}

.dark .register-info {
  color: var(--color-gray-400); /* dark:text-gray-400 */
}

.register-link {
  font-weight: 500; /* font-medium */
  color: var(--color-black); /* text-black */
}

.register-link:hover {
  color: var(--color-gray-600); /* hover:text-gray-800 */
}

.dark .register-link {
  color: var(--color-white); /* dark:text-white */
}

.dark .register-link:hover {
  color: var(--color-gray-300); /* dark:hover:text-gray-300 */
}
</style>