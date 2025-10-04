import request from './request'

/**
 * 聊天相关API
 */
export const chatApi = {
  /**
   * 获取对话列表
   * @returns {Promise} 对话列表
   */
  getConversations() {
    return request.get('/conversations')
  },

  /**
   * 创建新对话
   * @param {Object} data - 对话数据
   * @param {string} data.title - 对话标题
   * @returns {Promise} 创建结果
   */
  createConversation(data) {
    return request.post('/conversations', data)
  },

  /**
   * 删除对话
   * @param {string} conversationId - 对话ID
   * @returns {Promise} 删除结果
   */
  deleteConversation(conversationId) {
    return request.delete(`/conversations/${conversationId}`)
  },

  /**
   * 获取对话消息
   * @param {string} conversationId - 对话ID
   * @returns {Promise} 消息列表
   */
  getMessages(conversationId) {
    return request.get(`/conversations/${conversationId}/messages`)
  },

  /**
   * 发送消息
   * @param {Object} data - 消息数据
   * @param {string} data.content - 消息内容
   * @param {string} data.conversationId - 对话ID
   * @param {string} data.model - 模型名称
   * @returns {Promise} 发送结果
   */
  sendMessage(data) {
    return request.post('/chat/completions', data)
  },

  /**
   * 流式发送消息
   * @param {Object} data - 消息数据
   * @param {Function} onMessage - 消息回调
   * @param {Function} onError - 错误回调
   * @param {Function} onComplete - 完成回调
   */
  async streamMessage(data, onMessage, onError, onComplete) {
    try {
      const response = await fetch('/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          if (onComplete) onComplete()
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              if (onComplete) onComplete()
              return
            }
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                const content = parsed.choices[0].delta.content
                if (content && onMessage) {
                  onMessage(content)
                }
              }
            } catch (e) {
              console.warn('解析SSE数据失败:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('流式消息失败:', error)
      if (onError) onError(error)
    }
  },

  /**
   * 停止生成
   * @returns {Promise} 停止结果
   */
  stopGeneration() {
    return request.post('/chat/stop')
  },

  /**
   * 删除消息
   * @param {string} messageId - 消息ID
   * @returns {Promise} 删除结果
   */
  deleteMessage(messageId) {
    return request.delete(`/messages/${messageId}`)
  },

  /**
   * 分享消息
   * @param {Object} data - 分享数据
   * @param {Array} data.messageIds - 消息ID数组
   * @returns {Promise} 分享结果
   */
  shareMessages(data) {
    return request.post('/share', data)
  },

  /**
   * 获取分享内容
   * @param {string} shareId - 分享ID
   * @returns {Promise} 分享内容
   */
  getSharedContent(shareId) {
    return request.get(`/share/${shareId}`)
  },

  /**
   * 语音转文字
   * @param {FormData} formData - 音频文件
   * @returns {Promise} 转换结果
   */
  speechToText(formData) {
    return request.post('/speech-to-text', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 文字转语音
   * @param {Object} data - 转换数据
   * @param {string} data.text - 文本内容
   * @param {string} data.voice - 语音类型
   * @returns {Promise} 转换结果
   */
  textToSpeech(data) {
    return request.post('/text-to-speech', data, {
      responseType: 'blob'
    })
  }
}