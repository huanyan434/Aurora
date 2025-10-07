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
        // 获取新创建的对话信息
        const newConversation = {
          id: response.data.conversationID,
          title: '新对话',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        conversations.value.unshift(newConversation)
        currentConversation.value = newConversation
        messages.value = []
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
   * @returns {Promise<Object>} 获取结果
   */
  const fetchMessages = async (conversationId) => {
    console.log('获取对话消息:', conversationId)
    // 检查conversationId是否存在
    if (!conversationId) {
      messages.value = [];
      return { success: true, data: [] };
    }
    
    try {
      const response = await chatApi.getMessages(conversationId);
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
        messages.value = parsedMessages;
        return { success: true, data: parsedMessages };
      } else {
        messages.value = [];
        return { success: false, message: response.message || '获取消息失败' };
      }
    } catch (error) {
      console.error('获取对话消息失败:', error);
      messages.value = [];
      return { success: false, message: error.message || '获取消息失败' };
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
          id: model.ID || model.id || model,
          name: model.Name || model.name || model,
          reasoning: model.Reasoning || model.reasoning || '',
          image: model.Image !== undefined ? model.Image : (model.image !== undefined ? model.image : 0),
          points: model.Points || model.points || 0
        }))
        // 设置默认模型为列表中的第一个
        if (models.value.length > 0 && !selectedModel.value) {
          selectedModel.value = models.value[0].id
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
   */
  const setCurrentConversation = (conversation) => {
    console.log('设置当前对话:', conversation)
    currentConversation.value = conversation
    if (conversation && conversation.ID) {
      const conversationId = conversation.ID;
      fetchMessages(conversationId)
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
    stopGeneration,
    deleteMessage,
    fetchModels,
    shareMessages,
    clearMessages,
    setCurrentConversation,
    reset
  }
})