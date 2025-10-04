import request from './request'

/**
 * 用户相关API
 */
export const userApi = {
  /**
   * 用户登录
   * @param {Object} data - 登录数据
   * @param {string} data.username - 用户名
   * @param {string} data.password - 密码
   * @param {string} data.captcha - 验证码
   * @returns {Promise} 登录结果
   */
  login(data) {
    return request.post('/login', data)
  },

  /**
   * 用户注册
   * @param {Object} data - 注册数据
   * @param {string} data.username - 用户名
   * @param {string} data.password - 密码
   * @param {string} data.email - 邮箱
   * @param {string} data.captcha - 验证码
   * @returns {Promise} 注册结果
   */
  register(data) {
    return request.post('/signup', data)
  },

  /**
   * 获取当前用户信息
   * @returns {Promise} 用户信息
   */
  getCurrentUser() {
    return request.get('/current_user')
  },

  /**
   * 用户签到
   * @returns {Promise} 签到结果
   */
  signIn() {
    return request.post('/sign')
  },

  /**
   * 发送验证码
   * @param {Object} data - 包含邮箱地址的对象
   * @param {string} data.email - 邮箱地址
   * @returns {Promise} 发送结果
   */
  sendVerificationCode(data) {
    return request.post('/send_verify_code', data)
  },

  /**
   * 验证积分状态
   * @returns {Promise} 验证结果
   */
  verifyPoints() {
    return request.post('/verify_points')
  },

  /**
   * 验证VIP状态
   * @returns {Promise} 验证结果
   */
  verifyVip() {
    return request.post('/verify_vip')
  },

  /**
   * 获取模型列表
   * @returns {Promise} 模型列表
   */
  getModelsList() {
    return request.get('/models_list')
  },

  /**
   * 获取验证码图片
   * @returns {Promise} 验证码图片
   */
  getCaptcha() {
    return request.get('/auth/captcha')
  }
}