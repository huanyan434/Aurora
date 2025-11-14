
<template>
  <div class="register-container">
    <n-card class="register-card" :bordered="true">
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
        @keydown.enter="handleRegister"
      >
        <n-form-item path="email" class="form-item">
          <n-input
            v-model:value="formData.email"
            placeholder="请输入邮箱"
            type="email"
            :input-props="{ autocomplete: 'email' }"
            class="register-input"
          >
            <template #prefix>
              <n-icon :component="MailIcon" class="input-icon" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="password" class="form-item">
          <n-input
            v-model:value="formData.password"
            placeholder="请输入密码"
            type="password"
            show-password-on="mousedown"
            :input-props="{ autocomplete: 'new-password' }"
            class="register-input"
          >
            <template #prefix>
              <n-icon :component="LockIcon" class="input-icon" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="confirmPassword" class="form-item">
          <n-input
            v-model:value="formData.confirmPassword"
            placeholder="请确认密码"
            type="password"
            show-password-on="mousedown"
            :input-props="{ autocomplete: 'new-password' }"
            class="register-input"
          >
            <template #prefix>
              <n-icon :component="LockIcon" class="input-icon" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item class="form-item">
          <n-input-group>
            <n-input
              v-model:value="formData.verifyCode"
              placeholder="请输入验证码"
              class="verify-code-input"
            >
              <template #prefix>
                <n-icon :component="ShieldIcon" class="input-icon" />
              </template>
            </n-input>
            <n-button
              type="primary"
              ghost
              :loading="sendingCode"
              :disabled="!canSendCode"
              @click="handleSendCode"
              class="send-code-btn"
            >
              {{ codeButtonText }}
            </n-button>
          </n-input-group>
        </n-form-item>

        <n-form-item class="button-container">
          <n-button
            type="primary"
            size="large"
            block
            :loading="loading"
            @click="handleRegister"
            class="register-btn"
          >
            注册
          </n-button>
        </n-form-item>
      </n-form>

      <div class="register-footer">
        <p>
          已有账号？
          <n-button text type="primary" @click="goToLogin" class="login-btn">
            立即登录
          </n-button>
        </p>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { Mail as MailIcon, Lock as LockIcon, Shield as ShieldIcon } from '@vicons/tabler'
import { useUserStore } from '@/stores/user'

/**
 * 注册页面组件
 * 提供用户注册功能
 */

const router = useRouter()
const route = useRoute()
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
  email: '',
  password: '',
  confirmPassword: '',
  verifyCode: ''
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

// 获取重定向参数
const getRedirectParam = () => {
  const redirect = route.query.redirect
  return redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
}

// 跳转到登录页面
const goToLogin = () => {
  const redirectParam = getRedirectParam()
  router.push(`/login${redirectParam}`)
}

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
    
    // 从邮箱中提取用户名（@前的部分）
    const username = formData.email.split('@')[0]
    
    // 调用注册接口
    await userStore.signup({
      username: username,
      email: formData.email,
      password: formData.password,
      verifyCode: formData.verifyCode
    })
    
    message.success('注册成功')
    
    // 检查是否有重定向参数
    const redirect = route.query.redirect
    if (redirect) {
      // 跳转到指定页面
      console.log('注册成功，跳转到指定页面:', redirect)
      router.push(redirect)
    } else {
      // 跳转到登录页
      console.log('注册成功，跳转到登录页')
      router.push('/login')
    }
  } catch (error) {
    console.error('注册失败:', error)
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 380px;
  background-color: rgba(255, 255, 255, 0.95) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border: none !important;
  padding: 25px 20px;
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-title {
  font-size: 26px;
  font-weight: 700;
  color: #333;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.register-subtitle {
  font-size: 15px;
  color: #666;
  margin: 0;
}

.register-form {
  margin-bottom: 15px;
}

/* 表单项 */
.form-item {
  display: block;
}

/* 输入框样式 */
.register-input {
  background-color: #f8f9fa !important;
  border: 1px solid #e9ecef !important;
  color: #333 !important;
  border-radius: 12px !important;
  height: 42px;
  transition: all 0.3s ease;
}

.register-input:focus {
  border-color: #667eea !important;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.n-input__input-el {
  height: 42px !important;
  font-size: 14px;
}

/* 验证码输入框 */
.verify-code-input {
  background-color: #f8f9fa !important;
  border: 1px solid #e9ecef !important;
  color: #333 !important;
  border-radius: 12px !important;
  height: 42px;
  transition: all 0.3s ease;
  flex: 1;
}

.verify-code-input:focus {
  border-color: #667eea !important;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

/* 发送验证码按钮 */
.send-code-btn {
  border-radius: 12px !important;
  height: 42px;
  margin-left: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #fff !important;
  border: none !important;
  font-weight: 500;
  transition: all 0.3s ease;
}

.send-code-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 输入框图标 */
.input-icon {
  color: #667eea !important;
  font-size: 16px !important;
}

/* 注册按钮 */
.register-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 20px !important;
  height: 42px;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.3);
  margin-top: 5px;
}

.register-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.register-btn:active {
  transform: translateY(0);
}

/* 按钮容器 */
.button-container {
  margin-bottom: 0 !important;
  display: block;
}

.register-footer {
  text-align: center;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.register-footer p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.login-btn {
  color: #667eea !important;
  font-weight: 600;
  font-size: 14px;
}

.login-btn:hover {
  color: #764ba2 !important;
  text-decoration: underline !important;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .register-title {
    font-size: 24px;
  }
  
  .register-card {
    padding: 20px 15px;
  }
  
  .send-code-btn {
    margin-left: 0;
    margin-top: 10px;
  }
}
</style>