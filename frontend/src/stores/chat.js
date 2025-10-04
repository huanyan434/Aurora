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
  const currentConversationId = computed(() => currentConversation.value?.id)
  const hasMessages = computed(() => messages.value.length > 0)

  /**
   * 获取对话列表
   * @returns {Promise<Object>} 获取结果
   */
  const fetchConversations = async () => {
    try {
      const response = await chatApi.getConversations()
      if (response.success) {
        conversations.value = response.data
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
   * @param {string} title - 对话标题
   * @returns {Promise<Object>} 创建结果
   */
  const createConversation = async (title = '新对话') => {
    try {
      const response = await chatApi.createConversation({ title })
      if (response.success) {
        const newConversation = response.data
        conversations.value.unshift(newConversation)
        currentConversation.value = newConversation
        messages.value = []
        return { success: true, data: newConversation }
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
      if (response.success) {
        conversations.value = conversations.value.filter(conv => conv.id !== conversationId)
        if (currentConversation.value?.id === conversationId) {
          currentConversation.value = null
          messages.value = []
        }
        return { success: true }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('删除对话失败:', error)
      return { success: false, message: error.message || '删除对话失败' }
    }
  }

  /**
   * 获取对话消息
   * @param {string} conversationId - 对话ID
   * @returns {Promise<Object>} 获取结果
   */
  const fetchMessages = async (conversationId) => {
    try {
      const response = await chatApi.getMessages(conversationId)
      if (response.success) {
        messages.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('获取消息失败:', error)
      return { success: false, message: error.message || '获取消息失败' }
    }
  }

  /**
   * 发送消息
   * @param {Object} messageData - 消息数据
   * @param {string} messageData.content - 消息内容
   * @param {string} messageData.conversationId - 对话ID
   * @param {string} messageData.model - 模型名称
   * @returns {Promise<Object>} 发送结果
   */
  const sendMessage = async (messageData) => {
    try {
      // 添加用户消息到本地状态
      const userMessage = {
        id: Date.now().toString(),
        content: messageData.content,
        role: 'user',
        timestamp: new Date().toISOString()
      }
      messages.value.push(userMessage)

      // 添加AI消息占位符
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: '',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        isStreaming: true
      }
      messages.value.push(aiMessage)

      isGenerating.value = true

      const response = await chatApi.sendMessage(messageData)
      if (response.success) {
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('发送消息失败:', error)
      isGenerating.value = false
      // 移除失败的AI消息
      messages.value = messages.value.filter(msg => !msg.isStreaming)
      return { success: false, message: error.message || '发送消息失败' }
    }
  }

  /**
   * 流式接收消息
   * @param {Object} messageData - 消息数据
   * @param {Function} onMessage - 消息回调
   * @param {Function} onError - 错误回调
   * @param {Function} onComplete - 完成回调
   */
  const streamMessage = async (messageData, onMessage, onError, onComplete) => {
    try {
      // 添加用户消息到本地状态
      const userMessage = {
        id: Date.now().toString(),
        content: messageData.content,
        role: 'user',
        timestamp: new Date().toISOString()
      }
      messages.value.push(userMessage)

      // 添加AI消息占位符
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: '',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        isStreaming: true
      }
      messages.value.push(aiMessage)

      isGenerating.value = true
      
      await chatApi.streamMessage(messageData, (chunk) => {
        // 更新最后一条AI消息的内容
        const lastMessage = messages.value[messages.value.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content += chunk
          if (onMessage) onMessage(chunk)
        }
      }, (error) => {
        isGenerating.value = false
        // 移除失败的AI消息
        messages.value = messages.value.filter(msg => !msg.isStreaming)
        if (onError) onError(error)
      }, () => {
        isGenerating.value = false
        // 移除流式标记
        const lastMessage = messages.value[messages.value.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.isStreaming = false
        }
        if (onComplete) onComplete()
      })
    } catch (error) {
      console.error('流式消息失败:', error)
      isGenerating.value = false
      // 移除失败的AI消息
      messages.value = messages.value.filter(msg => !msg.isStreaming)
      if (onError) onError(error)
    }
  }

  /**
   * 停止生成
   * @returns {Promise<Object>} 停止结果
   */
  const stopGeneration = async () => {
    try {
      const response = await chatApi.stopGeneration()
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
      const response = await chatApi.deleteMessage(messageId)
      if (response.success) {
        messages.value = messages.value.filter(msg => msg.id !== messageId)
        return { success: true }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('删除消息失败:', error)
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
      if (response.success) {
        models.value = response.data
        // 设置默认模型
        if (models.value.length > 0 && !selectedModel.value) {
          selectedModel.value = models.value[0].id
        }
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error) {
      console.error('获取模型失败:', error)
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
      const response = await chatApi.shareMessages({ messageIds })
      if (response.success) {
        return { success: true, data: response.data }
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
   */
  const setCurrentConversation = (conversation) => {
    currentConversation.value = conversation
    if (conversation) {
      fetchMessages(conversation.id)
    } else {
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
    sendMessage,
    streamMessage,
    stopGeneration,
    deleteMessage,
    fetchModels,
    shareMessages,
    clearMessages,
    setCurrentConversation,
    reset
  }
})