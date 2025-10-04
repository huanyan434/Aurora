<template>
  <div class="register-container">
    <n-card class="register-card" :bordered="true" style="background-color: #18181c; border-color: #29292c;">
      <div class="register-header">
        <div class="register-title">Aurora AI</div>
        <p class="register-subtitle">创建您的账号</p>
      </div>

      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        size="large"
        class="register-form"
        :style="{ rowGap: '12px' }"
      >
        <n-form-item path="username">
          <n-input
            v-model:value="formData.username"
            placeholder="请输入用户名"
            :input-props="{ autocomplete: 'username' }"
            style="background-color: #101014; border: 1px solid #29292c; color: #349ff4;"
          >
            <template #prefix>
              <n-icon :component="UserIcon" color="#349ff4" />
            </template>
          </n-input>
        </n-form-item>

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
            :input-props="{ autocomplete: 'new-password' }"
            style="background-color: #101014; border: 1px solid #29292c; color: #349ff4;"
          >
            <template #prefix>
              <n-icon :component="LockIcon" color="#349ff4" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="confirmPassword">
          <n-input
            v-model:value="formData.confirmPassword"
            placeholder="请确认密码"
            type="password"
            show-password-on="mousedown"
            :input-props="{ autocomplete: 'new-password' }"
            style="background-color: #101014; border: 1px solid #29292c; color: #349ff4;"
          >
            <template #prefix>
              <n-icon :component="LockIcon" color="#349ff4" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="verifyCode">
          <n-input-group>
            <n-input
              v-model:value="formData.verifyCode"
              placeholder="请输入验证码"
              style="flex: 1; background-color: #101014; border: 1px solid #29292c; color: #349ff4;"
            >
              <template #prefix>
                <n-icon :component="ShieldIcon" color="#349ff4" />
              </template>
            </n-input>
            <n-button
              type="primary"
              ghost
              :loading="sendingCode"
              :disabled="!canSendCode"
              @click="handleSendCode"
              style="color: #349ff4; border-color: #349ff4;"
            >
              {{ codeButtonText }}
            </n-button>
          </n-input-group>
        </n-form-item>

        <n-form-item>
          <n-button
            type="primary"
            size="large"
            block
            :loading="loading"
            @click="handleRegister"
            style="background-color: #101014; color: #349ff4; border: none;"
            class="register-btn"
          >
            注册
          </n-button>
        </n-form-item>
      </n-form>

      <div class="register-footer">
        <p>
          已有账号？
          <n-button text style="color: #349ff4;" @click="$router.push('/login')">
            立即登录
          </n-button>
        </p>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { User as UserIcon, Mail as MailIcon, Lock as LockIcon, Shield as ShieldIcon } from '@vicons/tabler'
import { useUserStore } from '@/stores/user'

/**
 * 注册页面组件
 * 提供用户注册功能
 */

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()

// 表单引用
const formRef = ref(null)

// 加载状态
const loading = ref(false)
const sendingCode = ref(false)

// 验证码倒计时
const countdown = ref(0)
const countdownTimer = ref(null)

// 表单数据
const formData = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  verifyCode: ''
})

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度为2-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value) => {
        return value === formData.password
      },
      message: '两次输入的密码不一致',
      trigger: 'blur'
    }
  ],
  verifyCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位数字', trigger: 'blur' }
  ]
}

// 计算属性
const canSendCode = computed(() => {
  return formData.email && countdown.value === 0 && !sendingCode.value
})

const codeButtonText = computed(() => {
  if (countdown.value > 0) {
    return `${countdown.value}s后重发`
  }
  return '发送验证码'
})

/**
 * 发送验证码
 */
const handleSendCode = async () => {
  if (!formData.email) {
    message.error('请先输入邮箱')
    return
  }

  try {
    sendingCode.value = true
    
    await userStore.sendVerifyCode({ email: formData.email })
    
    message.success('验证码已发送')
    
    // 开始倒计时
    startCountdown()
  } catch (error) {
    message.error(error.message || '发送验证码失败')
  } finally {
    sendingCode.value = false
  }
}

/**
 * 开始倒计时
 */
const startCountdown = () => {
  countdown.value = 60
  countdownTimer.value = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer.value)
      countdownTimer.value = null
    }
  }, 1000)
}

/**
 * 处理注册
 */
const handleRegister = async () => {
  try {
    // 验证表单
    await formRef.value?.validate()
    
    loading.value = true
    
    // 调用注册接口
    await userStore.signup({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      verifyCode: formData.verifyCode
    })
    
    message.success('注册成功')
    
    // 跳转到登录页
    router.push('/login')
  } catch (error) {
    message.error(error.message || '注册失败')
  } finally {
    loading.value = false
  }
}

// 组件卸载时清理定时器
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
})
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #101014;
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 400px;
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.register-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.register-form {
  margin-bottom: 24px;
}

.register-footer {
  text-align: center;
}

.register-footer p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .register-title {
    font-size: 24px;
  }
}
</style>