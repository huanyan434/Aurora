import axios from 'axios'
import { useUserStore } from '@/stores/user'

// 创建axios实例
const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * 请求拦截器 - 添加认证token
 */
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

/**
 * 响应拦截器 - 处理响应和错误
 */
request.interceptors.response.use(
  (response) => {
    const { data } = response
    
    // 统一处理响应格式
    if (data.code === 200 || data.success) {
      return {
        success: true,
        data: data.data || data.result,
        message: data.message || '操作成功'
      }
    } else {
      return {
        success: false,
        message: data.message || '操作失败',
        code: data.code
      }
    }
  },
  (error) => {
    console.error('响应拦截器错误:', error)
    
    const userStore = useUserStore()
    
    // 处理不同的错误状态
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          userStore.logout()
          window.location.href = '/login'
          return Promise.reject(new Error('登录已过期，请重新登录'))
        
        case 403:
          return Promise.reject(new Error('权限不足'))
        
        case 404:
          return Promise.reject(new Error('请求的资源不存在'))
        
        case 500:
          return Promise.reject(new Error('服务器内部错误'))
        
        default:
          return Promise.reject(new Error(data?.message || `请求失败 (${status})`))
      }
    } else if (error.request) {
      // 网络错误
      return Promise.reject(new Error('网络连接失败，请检查网络设置'))
    } else {
      // 其他错误
      return Promise.reject(new Error(error.message || '请求失败'))
    }
  }
)

export default request