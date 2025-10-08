import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { chatApi } from '@/api/chat'
import { modelsApi } from '@/api/models'

/**
 * 聊天状态管理
 */
export const useChatStore = defineStore('chat', () => {
  // 状态
  const conversations = ref([])
  const currentConversation = ref(null)
  const messages = ref([])
  const isGenerating = ref(false)
  const models = ref([])
  const selectedModel = ref('')

  // 计算属性
  const currentConversationId = computed(() => currentConversation.value?.ID)
  const hasMessages = computed(() => messages.value.length > 0)

  /**
   * 获取对话列表
   * @returns {Promise<Object>} 获取结果
   */
  const fetchConversations = async () => {
    try {
      const response = await chatApi.getConversations()
      console.log('获取对话列表响应:', response)
      if (response.success) {
        conversations.value = response.data.conversations || []
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('获取对话列表失败:', error)
      return { success: false, message: error.message || '获取对话列表失败' }
    }
  }

  /**
   * 创建新对话
   * @returns {Promise<Object>} 创建结果
   */
  const createConversation = async () => {
    try {
      const response = await chatApi.createConversation()
      console.log('创建对话响应:', response)
      if (response.success) {
        // 注意：这里不再直接更新状态，只返回结果
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('创建对话失败:', error)
      return { success: false, message: error.message || '创建对话失败' }
    }
  }

  /**
   * 删除对话
   * @param {string} conversationId - 对话ID
   * @returns {Promise<Object>} 删除结果
   */
  const deleteConversation = async (conversationId) => {
    try {
      const response = await chatApi.deleteConversation(conversationId)
      console.log('删除对话响应:', response)
      if (response.success) {
        conversations.value = conversations.value.filter(conv => conv.ID !== conversationId)
        if (currentConversation.value?.ID === conversationId) {
          currentConversation.value = null
          messages.value = []
        }
        return { success: true }
      }
      return { success: false, message: response.message || '删除对话失败' }
    } catch (error) {
      console.error('删除对话失败:', error)
      return { success: false, message: error.message || '删除对话失败' }
    }
  }

  /**
   * 获取对话消息
   * @param {string} conversationId - 对话ID
   * @param {boolean} checkUnfinished - 是否检查未完成的对话，默认为 true
   * @returns {Promise<Object>} 获取结果
   */
  const fetchMessages = async (conversationId, checkUnfinished = true) => {
    console.log('获取对话消息:', conversationId, '检查未完成:', checkUnfinished)
    // 检查conversationId是否存在
    if (!conversationId) {
      messages.value = [];
      return { success: true, data: [] };
    }
    
    // 如果不检查未完成对话，则直接获取消息
    if (!checkUnfinished) {
      try {
        const response = await chatApi.getMessages(parseInt(conversationId, 10));
        console.log('获取对话消息响应:', response);
        if (response.success) {
          // 解析消息数据
          let parsedMessages = [];
          if (response.data && response.data.messages) {
            try {
              const messagesStr = response.data.messages;
              // 检查是否为'null'字符串
              if (messagesStr && messagesStr !== 'null') {
                parsedMessages = JSON.parse(messagesStr);
              }
            } catch (e) {
              console.error('解析消息数据失败:', e);
              parsedMessages = [];
            }
          }
          // 只有在有新消息时才替换现有消息
          if (parsedMessages.length > 0) {
            messages.value = parsedMessages;
          }
          return { success: true, data: messages.value };
        } else {
          // 即使获取失败也不清空现有消息
          return { success: false, message: response.message || '获取消息失败' };
        }
      } catch (error) {
        console.error('获取对话消息失败:', error);
        // 即使获取失败也不清空现有消息
        return { success: false, message: error.message || '获取消息失败' };
      }
    }
    
    try {
      // 首先检查是否有未完成的对话
      // 但仅当当前没有在生成消息且需要检查未完成对话时才检查（避免与正在进行的流式传输冲突）
      if (checkUnfinished && !isGenerating.value) {
        const threadListResponse = await chatApi.getThreadList();
        console.log('线程列表响应:', threadListResponse);
        
        // 检查当前对话是否在未完成的对话列表中
        if (threadListResponse.success && threadListResponse.data && threadListResponse.data.thread_list) {
          const threadList = threadListResponse.data.thread_list;
          // 明确将conversationId转换为字符串类型进行匹配
          const currentThread = threadList[conversationId];
        
          // 如果当前对话有未完成的消息，则继续生成
          if (currentThread) {
            console.log('发现未完成的对话，继续生成:', currentThread);
            // 获取当前对话的消息
            const response = await chatApi.getMessages(parseInt(conversationId, 10));
            if (response.success) {
              let parsedMessages = [];
              if (response.data && response.data.messages) {
                try {
                  const messagesStr = response.data.messages;
                  if (messagesStr && messagesStr !== 'null') {
                    parsedMessages = JSON.parse(messagesStr);
                  }
                } catch (e) {
                  console.error('解析消息数据失败:', e);
                  parsedMessages = [];
                }
              }
            
              // 只有在有新消息时才替换现有消息
              if (parsedMessages.length > 0) {
                messages.value = parsedMessages;
              }
            
              // 添加AI消息占位符（包含模型信息）
              const aiMessage = {
                id: currentThread.messageAssistantID.toString(),
                content: '', // 先设置为空，等待流式数据
                role: 'assistant',
                createdAt: new Date().toISOString(),
                isStreaming: true
              }
              messages.value.push(aiMessage);
            
              // 设置生成状态
              isGenerating.value = true;
            
              // 继续生成消息
              let accumulatedContent = '';
              await chatApi.sendMessage(
                {
                  conversationID: parseInt(conversationId, 10),
                  messageUserID: currentThread.messageUserID,
                  messageAssistantID: currentThread.messageAssistantID,
                  prompt: '', // 空的prompt，因为我们只是继续生成
                  model: '', // 空的model，后端应该能处理
                  base64: '',
                  reasoning: false
                },
                (content) => {
                  // 流式接收内容
                  accumulatedContent += content;
                  // 更新最后一条消息的内容
                  const lastMessage = messages.value[messages.value.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = accumulatedContent;
                  }
                },
                (error) => {
                  console.error('继续生成消息失败:', error);
                  isGenerating.value = false;
                },
                () => {
                  // 完成回调
                  const lastMessage = messages.value[messages.value.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.isStreaming = false;
                  }
                  isGenerating.value = false;
                }
              );
            
              return { success: true, data: messages.value };
            }
          }
        }
      }
    
      const response = await chatApi.getMessages(parseInt(conversationId, 10));
      console.log('获取对话消息响应:', response);
      if (response.success) {
        // 解析消息数据
        let parsedMessages = [];
        if (response.data && response.data.messages) {
          try {
            const messagesStr = response.data.messages;
            // 检查是否为'null'字符串
            if (messagesStr && messagesStr !== 'null') {
              parsedMessages = JSON.parse(messagesStr);
            }
          } catch (e) {
            console.error('解析消息数据失败:', e);
            parsedMessages = [];
          }
        }
        // 只有在有新消息时才替换现有消息
        if (parsedMessages.length > 0) {
          messages.value = parsedMessages;
        }
        return { success: true, data: messages.value };
      } else {
        // 即使获取失败也不清空现有消息
        return { success: false, message: response.message || '获取消息失败' };
      }
    } catch (error) {
      console.error('获取对话消息失败:', error);
      // 即使获取失败也不清空现有消息
      return { success: false, message: error.message || '获取消息失败' };
    }
  }

  /**
   * 停止生成
   * @param {Object} data - 停止生成数据
   * @param {number} data.conversationID - 对话ID
   * @returns {Promise<Object>} 停止结果
   */
  const stopGeneration = async (data) => {
    try {
      const response = await chatApi.stopGeneration(data)
      isGenerating.value = false
      
      // 移除流式标记
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.isStreaming = false
      }
      
      if (response.success) {
        return { success: true }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('停止生成失败:', error)
      isGenerating.value = false
      return { success: false, message: error.message || '停止生成失败' }
    }
  }

  /**
   * 删除消息
   * @param {string} messageId - 消息ID
   * @returns {Promise<Object>} 删除结果
   */
  const deleteMessage = async (messageId) => {
    try {
      console.log('删除消息请求参数:', { messageID: messageId })
      const response = await chatApi.deleteMessage({ messageID: messageId })
      console.log('删除消息响应:', response)
      if (response.success) {
        messages.value = messages.value.filter(msg => msg.id !== messageId)
        return { success: true }
      }
      return { success: false, message: response.message || '删除消息失败' }
    } catch (error) {
      console.error('删除消息失败:', error)
      // 即使API调用失败，也在本地删除消息
      messages.value = messages.value.filter(msg => msg.id !== messageId)
      return { success: false, message: error.message || '删除消息失败' }
    }
  }

  /**
   * 获取可用模型
   * @returns {Promise<Object>} 获取结果
   */
  const fetchModels = async () => {
    try {
      const response = await modelsApi.getModels()
      console.log('获取模型响应:', response)
      
      // 检查响应数据结构
      const modelsData = response.data?.models || response.data || []
      if (Array.isArray(modelsData) && modelsData.length > 0) {
        models.value = modelsData.map((model) => ({
          id: model.ID,
          name: model.Name,
          reasoning: model.Reasoning,
          image: model.Image !== undefined ? model.Image : 0,
          points: model.Points || 0
        }))
        // 设置默认模型为列表中的第一个，或者恢复缓存的模型选择
        if (models.value.length > 0) {
          const cachedModel = localStorage.getItem('selectedModel')
          if (cachedModel) {
            // 检查缓存的模型是否在可用模型列表中
            const modelExists = models.value.some(model => model.id === cachedModel)
            if (modelExists) {
              selectedModel.value = cachedModel
            } else {
              selectedModel.value = models.value[0].id
            }
          } else {
            selectedModel.value = models.value[0].id
          }
        }
        return { success: true, data: models.value }
      } else {
        // 如果没有模型数据，不提供默认选项
        models.value = []
        return { success: false, message: '模型数据为空' }
      }
    } catch (error) {
      console.error('获取模型失败:', error)
      // 获取模型失败时清空模型列表
      models.value = []
      return { success: false, message: error.message || '获取模型失败' }
    }
  }

  /**
   * 分享消息
   * @param {Array} messageIds - 消息ID数组
   * @returns {Promise<Object>} 分享结果
   */
  const shareMessages = async (messageIds) => {
    try {
      const response = await chatApi.shareMessages({ messageIDs: messageIds })
      if (response.success) {
        return { success: true, data: { share_id: response.data.share_id } }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('分享消息失败:', error)
      return { success: false, message: error.message || '分享消息失败' }
    }
  }

  /**
   * 清空消息
   */
  const clearMessages = () => {
    messages.value = []
  }

  /**
   * 设置当前对话
   * @param {Object} conversation - 对话对象
   * @param {boolean} checkUnfinished - 是否检查未完成的对话，默认为 true
   */
  const setCurrentConversation = (conversation, checkUnfinished = true) => {
    console.log('设置当前对话:', conversation, '是否检查未完成:', checkUnfinished)
    currentConversation.value = conversation
    if (conversation && conversation.ID) {
      const conversationId = conversation.ID;
      fetchMessages(conversationId, checkUnfinished)
    } else if (!conversation) {
      // 只有在明确设置为null时才清空消息，skipCheck场景下不触发清空
      messages.value = []
    }
  }

  /**
   * 重置聊天状态
   */
  const reset = () => {
    conversations.value = []
    currentConversation.value = null
    messages.value = []
    isGenerating.value = false
    models.value = []
    selectedModel.value = ''
  }

  return {
    // 状态
    conversations,
    currentConversation,
    messages,
    isGenerating,
    models,
    selectedModel,
    
    // 计算属性
    currentConversationId,
    hasMessages,
    
    // 方法
    fetchConversations,
    createConversation,
    deleteConversation,
    fetchMessages,
    stopGeneration,
    deleteMessage,
    fetchModels,
    shareMessages,
    clearMessages,
    setCurrentConversation,
    reset
  }
})
