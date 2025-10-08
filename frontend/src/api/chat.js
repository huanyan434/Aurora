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
    return request.get('/chat/conversations_list')
  },

  /**
   * 创建新对话
   * @returns {Promise} 创建结果
   */
  createConversation() {
    return request.get('/chat/new_conversation')
  },

  /**
   * 删除对话
   * @param {string} conversationId - 对话ID
   * @returns {Promise} 删除结果
   */
  deleteConversation(conversationId) {
    return request.post('/chat/delete_conversation', { conversationID: conversationId })
  },

  /**
   * 获取对话消息
   * @param {number} conversationId - 对话ID
   * @returns {Promise} 消息列表
   */
  getMessages(conversationId) {
    return request.post('/chat/messages_list', { conversationID: conversationId });
  },

  /**
   * 发送消息（使用SSE流式传输）
   * @param {Object} data - 消息数据
   * @param {Function} onMessage - 消息回调
   * @param {Function} onError - 错误回调
   * @param {Function} onComplete - 完成回调
   */
  async sendMessage(data, onMessage, onError, onComplete) {
    try {
      // 处理BigInt序列化问题
      const requestData = {
        prompt: data.prompt,
        conversationID: data.conversationID,
        model: data.model,
        messageUserID: data.messageUserID,
        messageAssistantID: data.messageAssistantID,
        reasoning: data.reasoning
      };
      
      // 将BigInt转换为字符串
      if (typeof requestData.messageUserID === 'bigint') {
        requestData.messageUserID = requestData.messageUserID.toString();
      }
      if (typeof requestData.messageAssistantID === 'bigint') {
        requestData.messageAssistantID = requestData.messageAssistantID.toString();
      }
      if (typeof requestData.conversationID === 'bigint') {
        requestData.conversationID = requestData.conversationID.toString();
      }
      
      // 使用fetch实现SSE流式传输，因为EventSource不支持POST
      const response = await fetch('/chat/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (onComplete) onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim(); // 移除 'data:' 前缀
            if (data === '[DONE]') {
              if (onComplete) onComplete();
              return;
            }
              
              try {
                const parsed = JSON.parse(data);
                // 处理推理内容和实际内容
                let messageContent = '';
                if (parsed.reasoningContent) {
                  // 使用后端提供的推理时间和内容
                  messageContent = `<think time="${parsed.reasoningTime}">${parsed.reasoningContent}</think>`;
                } else if (parsed.content) {
                  messageContent = parsed.content;
                }
                
                if (messageContent && onMessage) {
                  onMessage(messageContent);
                }
              } catch (e) {
                console.warn('解析SSE数据失败:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        if (onError) onError(error);
      }
    },

  /**
   * 停止生成
   * @param {Object} data - 停止生成数据
   * @param {number} data.conversationID - 对话ID
   * @returns {Promise} 停止结果
   */
  stopGeneration(data) {
    return request.post('/chat/stop', data)
  },

  /**
   * 删除消息
   * @param {Object} data - 删除数据
   * @param {string} data.messageID - 消息ID
   * @returns {Promise} 删除结果
   */
  deleteMessage(data) {
    return request.post('/chat/delete_message', data)
  },

  /**
   * 分享消息
   * @param {Object} data - 分享数据
   * @param {Array} data.messageIDs - 消息ID数组
   * @returns {Promise} 分享结果
   */
  shareMessages(data) {
    return request.post('/chat/share_messages', data)
  },

  /**
   * 获取分享内容
   * @param {string} shareId - 分享ID
   * @returns {Promise} 分享内容
   */
  getSharedContent(shareId) {
    return request.get(`/chat/${shareId}`)
  },
  
  /**
   * 获取线程列表（未完成的对话）
   * @returns {Promise} 线程列表
   */
  getThreadList() {
    return request.post('/chat/thread_list');
  }

}