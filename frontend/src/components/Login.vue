<template>
  <div class="login-container">
    <n-config-provider :theme="customTheme">
      <n-card class="login-card" :bordered="true">
        <!-- 登录标题 -->
        <h1 class="login-title">登录到ME-Frp</h1>

        <!-- 登录表单 -->
        <n-form ref="formRef" :model="loginForm" :rules="rules" @submit.prevent="handleLogin">
          <n-form-item path="username">
            <n-input v-model:value="loginForm.username" placeholder="用户名/邮箱" size="large" :disabled="isLogging" />
          </n-form-item>

          <n-form-item path="password">
            <n-input v-model:value="loginForm.password" type="password" placeholder="密码" size="large"
              :disabled="isLogging" show-password-on="mousedown" />
          </n-form-item>

          <!-- 人机验证区域 -->
          <div class="vaptcha-section">
            <!-- CapVerify验证组件 -->
            <div class="cap-verify-container">
              <CapVerify 
                :width="'100%'"
                :height="'60px'"
                @solve="handleCapSolve"
                @error="handleCapError"
                @ready="handleCapReady"
              />
            </div>
            
            <!-- 隐藏的token输入框，用于表单验证 -->
            <n-form-item path="captchaToken" style="display: none;">
              <n-input v-model:value="loginForm.captchaToken" />
            </n-form-item>
          </div>
          

          
          <n-button type="primary" size="large" block :loading="isLogging"
            :disabled="!loginForm.username || !loginForm.password || !loginForm.captchaToken" @click="handleLogin" class="login-btn">
            {{ isLogging ? '登录中...' : '登录' }}
          </n-button>
        </n-form>
      </n-card>
    </n-config-provider>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { darkTheme, useMessage } from 'naive-ui'
import CapVerify from './CapVerify.vue'
// import type { UnifiedConfig } from '../types/config'

// 自定义主题配置
const customTheme = {
  ...darkTheme,
  common: {
    ...darkTheme.common,
    bodyColor: '#101014',
    cardColor: '#18181c',
    modalColor: '#18181c',
    popoverColor: '#18181c',
    tableHeaderColor: '#18181c',
    inputColor: '#303033',
    inputColorDisabled: '#303033',
    primaryColor: '#349ff4',
    primaryColorHover: '#4da8f5',
    primaryColorPressed: '#2891f3',
    borderColor: '#29292c',
    dividerColor: '#29292c'
  }
}

const emit = defineEmits(['login-success'])
const message = useMessage()

// 登录表单数据
const loginForm = ref({
  username: '',
  password: '',
  captchaToken: ''
})

// 验证状态
const isVerified = ref(false)



// 表单引用
const formRef = ref(null)

// 表单验证规则
const rules = {
  username: {
    required: true,
    message: '请输入用户名',
    trigger: 'blur'
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: 'blur'
  },
  captchaToken: {
    required: true,
    message: '请完成人机验证',
    trigger: 'blur'
  }
}

// 登录状态
const isLogging = ref(false)

// 处理CapVerify验证成功事件
function handleCapSolve(token: string) {
  console.log('Cap.js验证成功，获得token:', token)
  loginForm.value.captchaToken = token
  isVerified.value = true
  message.success('人机验证完成')
}

// 处理CapVerify验证错误事件
function handleCapError(error: string) {
  console.error('Cap.js验证失败:', error)
  isVerified.value = false
  loginForm.value.captchaToken = ''
  message.error(`验证失败: ${error}`)
}

// 处理CapVerify准备就绪事件
function handleCapReady() {
  console.log('Cap.js验证组件已准备就绪')
}

// 处理登录
async function handleLogin() {
  if (isLogging.value) return

  isLogging.value = true
  message.loading('正在登录中，请稍候...')

  try {
    console.log('开始登录:', loginForm.value.username)

    // 调用后端登录API命令
    const config = await invoke('api_login', {
      username: loginForm.value.username,
      password: loginForm.value.password,
      captchaToken: loginForm.value.captchaToken || null
    })

    console.log('登录成功，配置已保存:', config)

    message.success('登录成功，正在进入主界面...')

    // 延迟1秒后跳转
    setTimeout(() => {
      console.log('触发login-success事件')
      emit('login-success')
    }, 1000)

  } catch (error) {
    console.error('登录失败:', error)
    // 显示完整的错误信息
    const errorMessage = error && typeof error === 'string' ? error :
      error && typeof error === 'object' && 'message' in error ?
        (error as any).message : '登录失败，请检查用户名和密码';
    message.error(errorMessage)
    
    // 登录失败提示
    message.warning('登录失败，请检查用户名、密码和验证码')
  } finally {
    isLogging.value = false
  }
}

onMounted(async () => {
  console.log('登录组件已加载，准备登录')
})

onUnmounted(() => {
  // 组件卸载时的清理工作
  console.log('登录组件卸载')
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #101014;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-title {
  text-align: center;
  color: #349ff4;
  margin-bottom: 30px;
  font-size: 24px;
  font-weight: 600;
}

.login-btn {
  background-color: #101014 !important;
  color: #349ff4 !important;
  border: none !important;
}

.login-btn:hover {
  background-color: #1a1a1e !important;
  color: #4da8f5 !important;
}

.login-btn:focus {
  background-color: #101014 !important;
  color: #349ff4 !important;
}

.vaptcha-section {
  margin: 15px 0;
}

.cap-verify-container {
  margin: 15px 0;
}

/* CapVerify暗色主题覆盖 */
.cap-verify-container :deep(cap-widget) {
  --cap-background: #18181c;
  --cap-border-color: #29292c;
  --cap-border-radius: 6px;
  --cap-color: #ffffffd1;
  --cap-checkbox-background: #303033;
  --cap-checkbox-border: 1px solid #29292c;
  --cap-checkbox-border-radius: 4px;
  --cap-spinner-color: #349ff4;
  --cap-spinner-background-color: #29292c;
  --cap-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.cap-verify-container :deep(.cap-container) {
  background-color: #18181c !important;
  border-color: #29292c !important;
  color: #ffffffd1 !important;
}







@media (max-width: 480px) {
  .login-card {
    padding: 30px 20px;
    margin: 10px;
  }

  .login-title {
    font-size: 20px;
    margin-bottom: 20px;
  }
  
  .vaptcha-hint-btn {
    font-size: 11px;
  }
}
</style>