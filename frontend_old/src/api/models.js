import request from './request'

/**
 * 模型相关API
 */
export const modelsApi = {
  /**
   * 获取可用模型列表
   * @returns {Promise} 模型列表
   */
  getModels() {
    return request.get('/api/models_list');
  }
}