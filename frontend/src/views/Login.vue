<template>
  <div class="login-container">
    <n-card class="login-card" :bordered="true" style="background-color: #18181c; border-color: #29292c;">
      <div class="login-header">
        <div class="login-title">Aurora AI</div>
        <p class="login-subtitle">登录您的账号</p>
      </div>

      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        size="large"
        class="login-form"
        :style="{ rowGap: '12px' }"
      >
        <n-form-item path="email">
          <n-input
            v-model:value="formData.email"
            placeholder="请输入邮箱"
            type="email"
            :input-props="{ autocomplete: 'email' }"
            style="background-color: #101014; border: 1px solid #29292c; color: #349ff4;"
          >
            <template #prefix>
              <n-icon :component="MailIcon" color="#349ff4" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="password">
          <n-input
            v-model:value="formData.password"
            placeholder="请输入密码"
            type="password"
            show-password-on="mousedown"
            :input-props="{ autocomplete: 'current-password' }"
            style="background-color: #101014; border: 1px solid #29292c; color: #349ff4;"
          >
            <template #prefix>
              <n-icon :component="LockIcon" color="#349ff4" />
            </template>
          </n-input>
        </n-form-item>

        <div class="login-options">
          <n-checkbox v-model:checked="rememberMe">记住我</n-checkbox>
          <n-button text style="color: #349ff4;" @click="$router.push('/forgot-password')">
            忘记密码？
          </n-button>
        </div>

        <n-form-item>
          <n-button
            type="primary"
            size="large"
            block
            :loading="loading"
            @click="handleLogin"
            style="background-color: #101014; color: #349ff4; border: none;"
            class="login-btn"
          >
            登录
          </n-button>
        </n-form-item>
      </n-form>

      <div class="login-footer">
        <p>
          还没有账号？
          <n-button text type="primary" @click="$router.push('/register')">
            立即注册
          </n-button>
        </p>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { Mail as MailIcon, Lock as LockIcon } from '@vicons/tabler'
import { useUserStore } from '@/stores/user'

/**
 * 登录页面组件
 * 提供用户登录功能
 */

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

// 表单引用
const formRef = ref(null)

// 加载状态
const loading = ref(false)

// 表单数据
const formData = reactive({
  email: '',
  password: ''
})

// 表单验证规则
const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

/**
 * 处理登录
 */
const handleLogin = async () => {
  try {
    // 验证表单
    await formRef.value?.validate()
    
    loading.value = true
    
    // 调用登录接口
    await userStore.login(formData)
    
    message.success('登录成功')
    
    // 跳转到首页
    router.push('/')
  } catch (error) {
    if (error?.message) {
      message.error(error.message)
    } else {
      message.error('登录失败，请检查邮箱和密码')
    }
  } finally {
    loading.value = false
  }
}
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
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 16px;
  color: #a0a0a0;
  margin: 0;
}

.login-form {
  margin-bottom: 24px;
}

.login-footer {
  text-align: center;
}

.login-footer p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-title {
    font-size: 24px;
  }
}
</style>