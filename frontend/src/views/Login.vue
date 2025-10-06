<template>
  <div class="login-container">
    <n-card class="login-card" :bordered="true">
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
        @keydown.enter="handleLogin"
      >
        <n-form-item path="email" class="form-item">
          <n-input
            v-model:value="formData.email"
            placeholder="请输入邮箱"
            type="email"
            :input-props="{ autocomplete: 'email' }"
            class="login-input"
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
            :input-props="{ autocomplete: 'current-password' }"
            class="login-input"
          >
            <template #prefix>
              <n-icon :component="LockIcon" class="input-icon" />
            </template>
          </n-input>
        </n-form-item>

        <div class="login-options">
          <n-button text class="forgot-btn" @click="$router.push('/forgot-password')">
            忘记密码？
          </n-button>
        </div>

        <n-form-item class="button-container">
          <n-button
            type="primary"
            size="large"
            block
            :loading="loading"
            @click="handleLogin"
            class="login-btn"
          >
            登录
          </n-button>
        </n-form-item>
      </n-form>

      <div class="login-footer">
        <p>
          还没有账号？
          <n-button text type="primary" @click="goToRegister" class="register-btn">
            立即注册
          </n-button>
        </p>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { Mail as MailIcon, Lock as LockIcon } from '@vicons/tabler'
import { useUserStore } from '@/stores/user'

/**
 * 登录页面组件
 * 提供用户登录功能
 */

const router = useRouter()
const route = useRoute()
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

// 获取重定向参数
const getRedirectParam = () => {
  const redirect = route.query.redirect
  return redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
}

// 跳转到注册页面
const goToRegister = () => {
  const redirectParam = getRedirectParam()
  router.push(`/register${redirectParam}`)
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
    
    // 检查是否有重定向参数
    const redirect = route.query.redirect
    if (redirect) {
      // 跳转到指定页面
      console.log('登录成功，跳转到指定页面:', redirect)
      router.push(redirect)
    } else {
      // 跳转到首页
      console.log('登录成功，跳转到首页')
      router.push('/')
    }
  } catch (error) {
    const errorMsg = error?.message || '登录失败，请检查邮箱和密码'
    console.error('登录失败:', error)
    message.error(errorMsg)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 如果已经登录，根据重定向参数进行跳转
  if (userStore.isAuthenticated) {
    console.log('用户已登录，检查重定向参数')
    const redirect = route.query.redirect
    if (redirect) {
      console.log('跳转到指定页面:', redirect)
      router.push(redirect)
    } else {
      console.log('跳转到首页')
      router.push('/')
    }
  } else {
    console.log('用户未登录或认证信息不完整', {
      userInfo: userStore.userInfo,
      isAuthenticated: userStore.isAuthenticated
    })
  }
})
</script>

<style scoped>
/* 页面容器 */
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

/* 登录卡片 */
.login-card {
  width: 100%;
  max-width: 380px;
  background-color: rgba(255, 255, 255, 0.95) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border: none !important;
  padding: 25px 20px;
}

/* 登录头部 */
.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-title {
  font-size: 26px;
  font-weight: 700;
  color: #333;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-subtitle {
  font-size: 15px;
  color: #666;
  margin: 0;
}

/* 登录表单 */
.login-form {
  margin-bottom: 15px;
}

/* 表单项 */
.form-item {
  display: block;
}

/* 输入框样式 */
.login-input {
  background-color: #f8f9fa !important;
  border: 1px solid #e9ecef !important;
  color: #333 !important;
  border-radius: 12px !important;
  height: 42px;
  transition: all 0.3s ease;
}

.login-input:focus {
  border-color: #667eea !important;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.n-input__input-el {
  height: 42px !important;
  font-size: 14px;
}

/* 输入框图标 */
.input-icon {
  color: #667eea !important;
  font-size: 16px !important;
}

/* 登录选项（记住我+忘记密码） */
.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.forgot-btn {
  color: #667eea !important;
  font-weight: 500;
  font-size: 14px;
}

.forgot-btn:hover {
  color: #764ba2 !important;
  text-decoration: underline !important;
}

/* 按钮容器 */
.button-container {
  margin-bottom: 0 !important;
  display: block;
}

/* 登录按钮 */
.login-btn {
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
  margin-top: 0;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.login-btn:active {
  transform: translateY(0);
}

/* 登录底部 */
.login-footer {
  text-align: center;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.login-footer p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.register-btn {
  color: #667eea !important;
  font-weight: 600;
  font-size: 14px;
}

.register-btn:hover {
  color: #764ba2 !important;
  text-decoration: underline !important;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-title {
    font-size: 24px;
  }
  
  .login-card {
    padding: 20px 15px;
  }
  
  .login-options {
    flex-direction: row;
    align-items: center;
    gap: 0;
  }
}
</style>