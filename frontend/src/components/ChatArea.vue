<template>
  <div class="chat-area">
    <!-- 聊天头部 -->
    <div class="chat-header">
      <div class="chat-title">
        <h3>{{ conversationTitle }}</h3>
        <span class="message-count">{{ messages?.length || 0 }} 条消息</span>
      </div>
      
      <div class="chat-actions">
        <!-- 模型选择 -->
        <n-select
          v-model:value="selectedModel"
          :options="modelOptions"
          placeholder="选择模型"
          size="small"
          style="width: 200px"
          @update:value="handleModelChange"
        />
        
        <!-- 清空对话 -->
        <n-button
          quaternary
          size="small"
          @click="handleClearChat"
          title="清空对话"
        >
          <template #icon>
            <n-icon>
              <Trash />
            </n-icon>
          </template>
        </n-button>
        
        <!-- 分享对话 -->
        <n-button
          quaternary
          size="small"
          @click="handleShareChat"
          title="分享对话"
        >
          <template #icon>
            <n-icon>
              <Share />
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="messages-container" ref="messagesContainer">
      <div class="messages-list">
        <!-- 欢迎消息 -->
        <div v-if="!messages || messages.length === 0" class="welcome-message">
          <div class="welcome-content">
            <h2>欢迎使用 Aurora AI</h2>
            <p>我是您的智能助手，可以帮助您解答问题、处理任务。请输入您的问题开始对话。</p>
            
            <div class="quick-actions">
              <n-button
                v-for="action in quickActions"
                :key="action.text"
                quaternary
                @click="handleQuickAction(action.text)"
              >
                {{ action.text }}
              </n-button>
            </div>
          </div>
        </div>
        
        <!-- 消息项 -->
        <MessageItem
          v-for="message in messages"
          :key="message.id"
          :message="message"
          @regenerate="handleRegenerateMessage"
          @delete="handleDeleteMessage"
        />
        
        <!-- 加载指示器 -->
        <div v-if="isGenerating && !hasStreamingMessage" class="loading-message">
          <div class="loading-content">
            <n-spin size="small" />
            <span>AI正在思考中...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-container">
        <n-input
          v-model:value="inputMessage"
          type="textarea"
          placeholder="输入您的消息... (Shift + Enter 换行，Enter 发送)"
          :autosize="{ minRows: 1, maxRows: 6 }"
          :disabled="isGenerating"
          @keydown="handleKeydown"
          ref="inputRef"
        />
        
        <div class="input-actions">
          <!-- 语音输入 -->
          <n-button
            quaternary
            circle
            size="small"
            @click="handleVoiceInput"
            title="语音输入"
          >
            <template #icon>
              <n-icon>
                <Microphone />
              </n-icon>
            </template>
          </n-button>
          
          <!-- 停止生成 -->
          <n-button
            v-if="isGenerating"
            quaternary
            circle
            size="small"
            @click="handleStopGeneration"
            title="停止生成"
          >
            <template #icon>
              <n-icon>
                <Square />
              </n-icon>
            </template>
          </n-button>
          
          <!-- 发送按钮 -->
          <n-button
            v-else
            type="primary"
            circle
            size="small"
            :disabled="!inputMessage.trim()"
            @click="handleSendMessage"
            title="发送消息"
          >
            <template #icon>
              <n-icon>
                <Send />
              </n-icon>
            </template>
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { 
  NInput, 
  NButton, 
  NIcon, 
  NSelect, 
  NSpin,
  useMessage,
  useDialog
} from 'naive-ui'
import { 
  Send, 
  Microphone, 
  Square,
  Share,
  Trash
} from '@vicons/tabler'
import MessageItem from './MessageItem.vue'
import { useChatStore } from '@/stores/chat'
import { chatApi } from '@/api/chat'
import { useRouter } from 'vue-router'
import { generateUUID } from '@/utils/uuid'

export default {
  name: 'ChatArea',
  components: {
    NInput,
    NButton,
    NIcon,
    NSelect,
    NSpin,
    MessageItem,
    Send,
    Microphone,
    Square,
    Share,
    Trash
  },
  props: {
    /**
     * 当前对话
     */
    conversation: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    const message = useMessage()
    const dialog = useDialog()
    const chatStore = useChatStore()
    const router = useRouter()
    
    // 响应式引用
    const inputMessage = ref('')
    const inputRef = ref(null)
    const messagesContainer = ref(null)

    // 计算属性
    const messages = computed(() => chatStore.messages)
    const isGenerating = computed(() => chatStore.isGenerating)
    const selectedModel = computed({
      get: () => chatStore.selectedModel,
      set: (value) => chatStore.selectedModel = value
    })
    const conversationTitle = computed(() => {
      return props.conversation?.title || '新对话'
    })

    // 模型选项
    const modelOptions = computed(() => {
      return chatStore.models.map(model => ({
        label: model.name || model.id,
        value: model.id
      }))
    })

    // 是否有流式消息
    const hasStreamingMessage = computed(() => {
      return messages.value.some(msg => msg.isStreaming)
    })

    // 快捷操作
    const quickActions = ref([
      { text: '帮我写一篇文章' },
      { text: '解释一个概念' },
      { text: '代码调试帮助' },
      { text: '翻译文本' }
    ])

    /**
     * 滚动到底部
     */
    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    /**
     * 处理键盘事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    const handleKeydown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleSendMessage()
      }
    }

    /**
     * 处理发送消息
     */
    const handleSendMessage = async () => {
      const content = inputMessage.value.trim()
      if (!content || isGenerating.value) return

      // 检查是否有有效的对话
      const conversationId = chatStore.currentConversation?.ID;

      // 如果没有对话ID，先创建对话
      if (!conversationId) {
        const createResult = await chatStore.createConversation();
        if (createResult.success) {
          const newConversationId = createResult.data?.conversationID;
          // 更新路由
          if (newConversationId) {
            router.push(`/c/${newConversationId}`);
          }
        } else {
          message.error(createResult.message || '创建对话失败');
          chatStore.isGenerating = false;
          return;
        }
      }
      
      // 获取最终的对话ID（可能是新创建的）
      const finalConversationId = chatStore.currentConversation?.ID;
      
      // 生成消息ID
      const messageUserID = generateUUID();
      const messageAssistantID = generateUUID();
      
      const messageData = {
        prompt: content,
        conversationID: finalConversationId,
        model: selectedModel.value,
        messageUserID: messageUserID,
        messageAssistantID: messageAssistantID
      }

      // 清空输入框
      inputMessage.value = ''
      
      // 滚动到底部
      scrollToBottom()

      try {
        // 设置生成状态
        chatStore.isGenerating = true
        
        // 添加用户消息到本地状态
        const userMessage = {
          id: messageUserID, // 使用生成的UUID
          content: content,
          role: 'user',
          createdAt: new Date().toISOString()
        }
        chatStore.messages.push(userMessage)

        // 添加AI消息占位符
        const aiMessage = {
          id: messageAssistantID, // 使用生成的UUID
          content: '',
          role: 'assistant',
          createdAt: new Date().toISOString(),
          isStreaming: true
        }
        chatStore.messages.push(aiMessage)
        
        // 使用流式发送
        let accumulatedContent = ''
        await chatApi.sendMessage(
          messageData,
          (content) => {
            // 流式接收内容
            accumulatedContent += content
            // 更新最后一条消息的内容
            const lastMessage = chatStore.messages[chatStore.messages.length - 1]
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = accumulatedContent
            }
            scrollToBottom()
          },
          (error) => {
            message.error('消息发送失败')
            console.error('消息发送失败:', error)
            chatStore.isGenerating = false
          },
          () => {
            // 完成回调
            const lastMessage = chatStore.messages[chatStore.messages.length - 1]
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.isStreaming = false
            }
            chatStore.isGenerating = false
            scrollToBottom()
          }
        )
      } catch (error) {
        message.error(error.message || '发送失败')
        chatStore.isGenerating = false
      }
    }

    /**
     * 处理停止生成
     */
    const handleStopGeneration = async () => {
      try {
        await chatApi.stopGeneration()
        // 更新状态
        chatStore.isGenerating = false
        
        // 移除流式标记
        const lastMessage = chatStore.messages[chatStore.messages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.isStreaming = false
        }
        
        message.info('已停止生成')
      } catch (error) {
        message.error('停止失败')
      }
    }

    /**
     * 处理语音输入
     */
    const handleVoiceInput = () => {
      // TODO: 实现语音输入功能
      message.info('语音输入功能开发中...')
    }

    /**
     * 处理模型切换
     * @param {string} modelId - 模型ID
     */
    const handleModelChange = (modelId) => {
      chatStore.selectedModel = modelId
    }

    /**
     * 处理清空对话
     */
    const handleClearChat = () => {
      dialog.warning({
        title: '确认清空',
        content: '确定要清空当前对话的所有消息吗？此操作不可撤销。',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: () => {
          chatStore.clearMessages()
          message.success('对话已清空')
        }
      })
    }

    /**
     * 处理分享对话
     */
    const handleShareChat = async () => {
      if (messages.value.length === 0) {
        message.warning('当前对话没有消息可分享')
        return
      }

      try {
        const messageIds = messages.value.map(msg => msg.id)
        const result = await chatStore.shareMessages(messageIds)
        
        if (result.success) {
          const shareUrl = `${window.location.origin}/share/${result.data.share_id}`
          await navigator.clipboard.writeText(shareUrl)
          message.success('分享链接已复制到剪贴板')
        } else {
          message.error(result.message || '分享失败')
        }
      } catch (error) {
        message.error('分享失败')
      }
    }

    /**
     * 处理快捷操作
     * @param {string} text - 操作文本
     */
    const handleQuickAction = (text) => {
      inputMessage.value = text
      inputRef.value?.focus()
    }

    /**
     * 处理重新生成消息
     * @param {Object} msg - 消息对象
     */
    const handleRegenerateMessage = async (msg) => {
      // 找到用户的上一条消息
      const messageIndex = messages.value.findIndex(m => m.id === msg.id)
      if (messageIndex > 0) {
        const userMessage = messages.value[messageIndex - 1]
        if (userMessage.role === 'user') {
          // 删除当前AI消息
          await chatStore.deleteMessage(msg.id)
          
          // 重新发送用户消息
          // 确保有有效的对话ID
          let conversationId = chatStore.currentConversation?.ID;
          
          // 如果没有对话ID，先创建对话
          if (!conversationId) {
            const createResult = await chatStore.createConversation();
            if (createResult.success) {
              conversationId = createResult.data?.conversationID;
              // 更新路由
              if (conversationId) {
                router.push(`/c/${conversationId}`);
              }
            } else {
              message.error(createResult.message || '创建对话失败');
              chatStore.isGenerating = false;
              return;
            }
          }
          
          const messageData = {
            prompt: userMessage.content,
            conversationID: conversationId,
            model: selectedModel.value
          }
          
          try {
            // 设置生成状态
            chatStore.isGenerating = true

            // 添加AI消息占位符
            const aiMessage = {
              id: 'assistant_' + Date.now(),
              content: '',
              role: 'assistant',
              createdAt: new Date().toISOString(),
              isStreaming: true
            }
            chatStore.messages.push(aiMessage)
            
            // 使用流式发送
            let accumulatedContent = ''
            await chatApi.sendMessage(
              messageData,
              (content) => {
                // 流式接收内容
                accumulatedContent += content
                // 更新最后一条消息的内容
                const lastMessage = chatStore.messages[chatStore.messages.length - 1]
                if (lastMessage && lastMessage.role === 'assistant') {
                  lastMessage.content = accumulatedContent
                }
                scrollToBottom()
              },
              (error) => {
                message.error('消息发送失败')
                console.error('消息发送失败:', error)
                chatStore.isGenerating = false
              },
              () => {
                // 完成回调
                const lastMessage = chatStore.messages[chatStore.messages.length - 1]
                if (lastMessage && lastMessage.role === 'assistant') {
                  lastMessage.isStreaming = false
                }
                chatStore.isGenerating = false
                scrollToBottom()
              }
            )
          } catch (error) {
            message.error('重新生成失败')
            chatStore.isGenerating = false
          }
        }
      }
    }

    /**
     * 处理删除消息
     * @param {Object} msg - 消息对象
     */
    const handleDeleteMessage = async (msg) => {
      try {
        const result = await chatStore.deleteMessage(msg.id)
        if (result.success) {
          message.success('消息已删除')
        } else {
          message.error(result.message || '删除失败')
        }
      } catch (error) {
        message.error('删除失败')
      }
    }

    // 监听消息变化，自动滚动到底部
    watch(messages, () => {
      scrollToBottom()
    }, { deep: true })

    // 组件挂载时获取模型列表
    onMounted(async () => {
      console.log('开始获取模型列表')
      try {
        const result = await chatStore.fetchModels()
        console.log('获取模型结果:', result)
        if (!result.success) {
          message.warning('获取AI模型列表失败，将使用默认模型')
        } else {
          console.log('成功获取模型:', chatStore.models)
        }
      } catch (error) {
        console.error('获取模型异常:', error)
        message.warning('获取AI模型列表失败，将使用默认模型')
      }
    })

    return {
      inputMessage,
      inputRef,
      messagesContainer,
      messages,
      isGenerating,
      selectedModel,
      conversationTitle,
      modelOptions,
      hasStreamingMessage,
      quickActions,
      handleKeydown,
      handleSendMessage,
      handleStopGeneration,
      handleVoiceInput,
      handleModelChange,
      handleClearChat,
      handleShareChat,
      handleQuickAction,
      handleRegenerateMessage,
      handleDeleteMessage
    }
  }
}
</script>

<style scoped>
.chat-area {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.chat-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.message-count {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.chat-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
}

.messages-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px 0;
}

.welcome-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
}

.welcome-content {
  text-align: center;
  max-width: 500px;
}

.welcome-content h2 {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.welcome-content p {
  margin: 0 0 24px 0;
  font-size: 16px;
  color: #666;
  line-height: 1.6;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.loading-message {
  display: flex;
  align-items: center;
  padding: 16px 0;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
}

.input-area {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.input-container {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.input-actions {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .chat-header {
    padding: 12px 16px;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .chat-actions {
    justify-content: space-between;
  }
  
  .messages-container {
    padding: 0 16px;
  }
  
  .messages-list {
    padding: 16px 0;
  }
  
  .input-area {
    padding: 12px 16px;
  }
  
  .quick-actions {
    flex-direction: column;
  }
}
</style>