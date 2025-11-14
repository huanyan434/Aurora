import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@/api/user'

/**
 * 用户状态管理
 */
export const useUserStore = defineStore('user', () => {
  // 状态
  const userInfo = ref(null)
  const initialized = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => {
    const auth = !!userInfo.value
    console.log('计算认证状态:', { 
      hasUserInfo: !!userInfo.value, 
      result: auth,
      userInfo: userInfo.value
    })
    return auth
  })

  /**
   * 用户登录
   * @param {Object} credentials - 登录凭据
   * @param {string} credentials.email - 邮箱
   * @param {string} credentials.password - 密码
   * @returns {Promise<Object>} 登录结果
   */
  const login = async (credentials) => {
    try {
      console.log('开始登录流程')
      const response = await userApi.login(credentials)
      console.log('登录API响应:', response)
      if (response.success) {
        // 登录成功后获取用户信息
        try {
          console.log('获取用户信息')
          const userResponse = await userApi.getCurrentUser()
          console.log('用户信息响应:', userResponse)
          if (userResponse.success) {
            userInfo.value = userResponse.data || userResponse
          }
        } catch (error) {
          console.error('获取用户信息失败:', error)
        }
        
        return { success: true, data: response.data || response }
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
      const response = await userApi.register(userData)
      if (response.success) {
        return { success: true, message: response.message || '注册成功' }
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
        userInfo.value = response.data || response
        return { success: true, data: response.data || response }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 如果获取用户信息失败，清除用户信息
      userInfo.value = null
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
          userInfo.value.points = response.points || userInfo.value.points
        }
        return { success: true, data: response }
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
      const response = await userApi.sendVerificationCode(data)
      if (response.success) {
        return { success: true, message: response.message || '验证码发送成功' }
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
    return await register(userData)
  }

  /**
   * 验证积分和VIP状态
   * @returns {Promise<Object>} 验证结果
   */
  const verifyPointsAndVip = async () => {
    try {
      // 这里可能需要分别调用两个API
      const pointsResponse = await userApi.verifyPoints()
      const vipResponse = await userApi.verifyVip()
      
      return { 
        success: true, 
        data: { 
          points: pointsResponse,
          vip: vipResponse
        } 
      }
    } catch (error) {
      console.error('验证积分和VIP状态失败:', error)
      return { success: false, message: error.message || '验证失败' }
    }
  }

  /**
   * 用户登出
   */
  const logout = () => {
    console.log('用户登出')
    userInfo.value = null
  }

  /**
   * 初始化用户状态
   */
  const init = async () => {
    console.log('初始化用户状态，用户信息:', userInfo.value)
    // 尝试从服务器获取用户信息以恢复会话
    await getCurrentUser()
    initialized.value = true
    console.log('用户状态初始化完成，已初始化:', initialized.value, '用户信息:', userInfo.value)
  }

  /**
   * 检查签到状态
   * @returns {Promise<Object>} 签到状态结果
   */
  const checkSignInStatus = async () => {
    try {
      const response = await userApi.checkSignInStatus()
      return response
    } catch (error) {
      console.error('检查签到状态失败:', error)
      return { success: false, message: error.message || '检查签到状态失败' }
    }
  }

  return {
    // 状态
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
    checkSignInStatus,
    sendVerificationCode,
    sendVerifyCode,
    verifyPointsAndVip,
    logout,
    init
  }
})