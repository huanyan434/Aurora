import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@/api/user'

/**
 * 用户状态管理
 */
export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)
  const initialized = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!userInfo.value)

  /**
   * 用户登录
   * @param {Object} credentials - 登录凭据
   * @param {string} credentials.username - 用户名
   * @param {string} credentials.password - 密码
   * @param {string} credentials.captcha - 验证码
   * @returns {Promise<Object>} 登录结果
   */
  const login = async (credentials) => {
    try {
      const response = await userApi.login(credentials)
      if (response.success) {
        token.value = response.data.token
        userInfo.value = response.data.user
        localStorage.setItem('token', token.value)
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, message: error.message || '登录失败' }
    }
  }

  /**
   * 用户注册
   * @param {Object} userData - 注册数据
   * @param {string} userData.username - 用户名
   * @param {string} userData.password - 密码
   * @param {string} userData.email - 邮箱
   * @param {string} userData.verifyCode - 验证码
   * @returns {Promise<Object>} 注册结果
   */
  const register = async (userData) => {
    try {
      // 确保请求体包含正确的字段名
      const requestData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        verifyCode: userData.verifyCode || userData.verify_code
      }
      
      const response = await userApi.register(requestData)
      if (response.success) {
        return { success: true, message: '注册成功' }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('注册失败:', error)
      return { success: false, message: error.message || '注册失败' }
    }
  }

  /**
   * 获取当前用户信息
   * @returns {Promise<Object>} 用户信息
   */
  const getCurrentUser = async () => {
    try {
      const response = await userApi.getCurrentUser()
      if (response.success) {
        userInfo.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return { success: false, message: error.message || '获取用户信息失败' }
    }
  }

  /**
   * 用户签到
   * @returns {Promise<Object>} 签到结果
   */
  const signIn = async () => {
    try {
      const response = await userApi.signIn()
      if (response.success) {
        // 更新用户信息中的积分
        if (userInfo.value) {
          userInfo.value.points = response.data.points
        }
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('签到失败:', error)
      return { success: false, message: error.message || '签到失败' }
    }
  }

  /**
   * 发送验证码
   * @param {Object} data - 包含邮箱的对象
   * @param {string} data.email - 邮箱地址
   * @returns {Promise<Object>} 发送结果
   */
  const sendVerificationCode = async (data) => {
    try {
      // 确保data是一个包含email字段的对象
      const requestData = typeof data === 'string' 
        ? { email: data } 
        : data
        
      const response = await userApi.sendVerificationCode(requestData)
      if (response.success) {
        return { success: true, message: '验证码发送成功' }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('发送验证码失败:', error)
      return { success: false, message: error.message || '发送验证码失败' }
    }
  }

  /**
   * 发送验证码 (别名方法，兼容注册页面调用)
   * @param {Object} data - 包含邮箱的对象
   * @param {string} data.email - 邮箱地址
   * @returns {Promise<Object>} 发送结果
   */
  const sendVerifyCode = async (data) => {
    return await sendVerificationCode(data)
  }

  /**
   * 用户注册 (别名方法，兼容注册页面调用)
   * @param {Object} userData - 注册数据
   * @param {string} userData.username - 用户名
   * @param {string} userData.password - 密码
   * @param {string} userData.email - 邮箱
   * @param {string} userData.verifyCode - 验证码
   * @returns {Promise<Object>} 注册结果
   */
  const signup = async (userData) => {
    // 直接使用userData中的verifyCode字段
    return await register(userData)
  }

  /**
   * 验证积分和VIP状态
   * @returns {Promise<Object>} 验证结果
   */
  const verifyPointsAndVip = async () => {
    try {
      const response = await userApi.verifyPointsAndVip()
      if (response.success) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('验证积分和VIP状态失败:', error)
      return { success: false, message: error.message || '验证失败' }
    }
  }

  /**
   * 用户登出
   */
  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  /**
   * 初始化用户状态
   */
  const init = async () => {
    if (token.value) {
      await getCurrentUser()
    }
    initialized.value = true
  }

  return {
    // 状态
    token,
    userInfo,
    initialized,
    
    // 计算属性
    isAuthenticated,
    
    // 方法
    login,
    register,
    signup,
    getCurrentUser,
    signIn,
    sendVerificationCode,
    sendVerifyCode,
    verifyPointsAndVip,
    logout,
    init
  }
})