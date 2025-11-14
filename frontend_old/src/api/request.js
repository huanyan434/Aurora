import axios from 'axios'

// 创建axios实例
const request = axios.create({
  timeout: 15000, // 增加超时时间到15秒
  headers: {
    'Content-Type': 'application/json'
  }
})


/**
 * 响应拦截器 - 处理响应和错误
 */
request.interceptors.response.use(
  (response) => {
    const { data } = response
    console.log('API响应:', response.config.url, data)
    
    // 对于模型列表API的特殊处理
    if (response.config.url === '/api/models_list') {
      // 模型列表API直接返回数据
      return {
        success: true,
        data: data
      };
    }
    
    // 统一处理响应格式
    if (data.code === 200 || data.success) {
      return {
        success: true,
        data: data.data || data.result || data,
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
    
    // 处理不同的错误状态
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // 未授权，跳转到登录页
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
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('请求超时，请稍后重试'))
      }
      return Promise.reject(new Error('网络连接失败，请检查网络设置'))
    } else {
      // 其他错误
      return Promise.reject(new Error(error.message || '请求失败'))
    }
  }
)

export default request