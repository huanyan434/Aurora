<template>
  <div class="chat-area">
    <!-- 顶部模型选择 -->
    <div class="model-selection-header">
      <div class="model-selection-wrapper">
        <div class="model-info">
          <!-- 自定义模型选择下拉框 -->
          <div class="aurora-model-select" @click="toggleModelDropdown">
            <div class="selected-model">
              <span class="model-name">{{ selectedModelName }}</span>
              <n-icon class="dropdown-icon" :class="{ rotated: showModelDropdown }">
                <ChevronDown />
              </n-icon>
            </div>
          </div>
          
          <!-- 下拉列表 -->
          <div v-if="showModelDropdown" class="model-dropdown" v-click-outside="closeModelDropdown">
            <div 
              v-for="model in models" 
              :key="model.id" 
              class="model-option"
              @click="selectModel(model.id)"
            >
              <div class="model-main-info">
                <span class="model-name">{{ model.name }}</span>
              </div>
              <div class="model-extra-info">
                <!-- 推理能力 -->
                <span v-if="model.reasoning" class="model-capability reasoning">推理</span>
                <!-- 识图能力 -->
                <span v-if="model.image === 1 || model.image === 3" class="model-capability image">识图</span>
                <!-- 积分消耗 -->
                <span v-if="model.points > 0" class="model-points">{{ model.points }}积分/次</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="messages-container" ref="messagesContainer">
      <div class="messages-list" ref="messagesList">
        <!-- 消息项 -->
        <MessageItem
          v-for="message in messages"
          :key="message.id"
          :message="message"
          @copy="handleCopyMessage"
          @regenerate="handleRegenerateMessage"
          @delete="handleDeleteMessage"
          @share="handleShareMessage"
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

    <!-- 滚动到底部按钮 -->
    <div 
      class="scroll-to-bottom-button" 
      :class="{ 'visible': showScrollToBottomButton }"
      @click="scrollToBottomAndHideButton"
    >
      <n-button circle>
        <n-icon size="24">
          <ArrowDown />
        </n-icon>
      </n-button>
    </div>

    <!-- 输入区域 -->
    <ChatInput
      :is-generating="isGenerating"
      :is-reasoning="isReasoningActive"
      :is-reasoning-disabled="isReasoningDisabled"
      :show-reasoning-button="showReasoningButton"
      @send-message="handleSendMessage"
      @stop-generation="handleStopGeneration"
      @toggle-reasoning="toggleReasoning"
      @file-upload="handleFileUpload"
    />
  </div>
</template>

<script>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { 
  NButton, 
  NIcon, 
  NSpin,
  useMessage,
  useDialog
} from 'naive-ui'
import { 
  Send, 
  Microphone, 
  Square,
  Share,
  Trash,
  Plus,
  Bulb,
  ArrowDown,
  ChevronDown
} from '@vicons/tabler'
import MessageItem from './MessageItem.vue'
import ChatInput from './ChatInput.vue'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { chatApi } from '@/api/chat'
import { useRouter } from 'vue-router'
import { generateSnowflakeId } from '@/utils/snowflake'

// 点击外部指令
const vClickOutside = {
  beforeMount(el, binding) {
    el.clickOutsideEvent = function(event) {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.body.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.clickOutsideEvent)
  }
}

export default {
  name: 'ChatArea',
  components: {
    NButton,
    NIcon,
    NSpin,
    MessageItem,
    ChatInput,
    Send,
    Microphone,
    Square,
    Share,
    Plus,
    Bulb,
    ArrowDown,
    ChevronDown
  },
  directives: {
    clickOutside: vClickOutside
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
  emits: ['share'],
  setup(props, { emit }) {
    const message = useMessage()
    const dialog = useDialog()
    const chatStore = useChatStore()
    const userStore = useUserStore()
    const router = useRouter()
    
    // 响应式引用
    const messagesContainer = ref(null)
    const messagesList = ref(null)
    const isReasoning = ref(false)
    const showScrollToBottomButton = ref(false)
    const isAutoScrolling = ref(true)
    const showModelDropdown = ref(false)
    let scrollTimeout = null

    // 计算属性
    const messages = computed(() => chatStore.messages)
    const isGenerating = computed(() => chatStore.isGenerating)
    const selectedModel = computed({
      get: () => chatStore.selectedModel,
      set: (value) => chatStore.selectedModel = value
    })
    const userInfo = computed(() => userStore.userInfo)

    // 模型选项
    const models = computed(() => chatStore.models)

    // 选中的模型名称
    const selectedModelName = computed(() => {
      const model = chatStore.models.find(m => m.id === selectedModel.value)
      return model ? model.name : '选择模型'
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
    
    // 当前选中的模型
    const currentModel = computed(() => {
      return chatStore.models.find(model => model.id === selectedModel.value)
    })
    
    // 是否显示推理按钮
    const showReasoningButton = computed(() => {
      // 如果没有当前模型，显示按钮
      if (!currentModel.value) return true
      
      // 如果模型的 reasoning 字段为空，表示不支持推理，隐藏按钮
      return currentModel.value.reasoning !== ''
    })
    
    // 推理按钮是否禁用
    const isReasoningDisabled = computed(() => {
      // 如果没有当前模型，不禁用
      if (!currentModel.value) return false
      
      // 如果模型的 reasoning 字段等于模型 ID，表示只支持推理，禁用按钮
      return currentModel.value.reasoning === currentModel.value.id
    })
    
    // 推理按钮是否激活
    const isReasoningActive = computed(() => {
      // 如果没有当前模型，不激活
      if (!currentModel.value) return false
      
      // 如果模型的 reasoning 字段等于模型 ID，表示只支持推理，激活按钮
      if (currentModel.value.reasoning === currentModel.value.id) return true
      
      // 其他情况下，根据 isReasoning 状态
      return isReasoning.value
    })
    
    // 监听对话变化
    watch(() => props.conversation, (newConversation) => {
      if (newConversation) {
        // 清空消息
        chatStore.clearMessages()
      }
    }, { immediate: true })

    /**
     * 切换模型下拉框显示状态
     */
    const toggleModelDropdown = (event) => {
      // 阻止事件冒泡
      event.stopPropagation()
      showModelDropdown.value = !showModelDropdown.value
    }

    /**
     * 关闭模型下拉框
     */
    const closeModelDropdown = () => {
      showModelDropdown.value = false
    }

    /**
     * 选择模型
     */
    const selectModel = (modelId) => {
      chatStore.selectedModel = modelId
      closeModelDropdown()
    }

    /**
     * 滚动到底部
     */
    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value && isAutoScrolling.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }
    
    /**
     * 滚动到底部并隐藏按钮
     */
    const scrollToBottomAndHideButton = () => {
      isAutoScrolling.value = true
      showScrollToBottomButton.value = false
      scrollToBottom()
    }

    /**
     * 处理发送消息
     */
    const handleSendMessage = async (content) => {
      if (!content || isGenerating.value) return

      // 检查是否有有效的对话
      let conversationId = chatStore.currentConversation?.ID;

      // 如果没有对话ID，先创建对话
      if (!conversationId) {
        const createResult = await chatStore.createConversation();
        if (createResult.success) {
          const newConversationId = createResult.data?.conversationID;
          // 更新路由
          if (newConversationId) {
            router.push(`/c/${newConversationId}`);
            // 更新 conversationId 变量以供后续使用
            conversationId = newConversationId;
          }
        } else {
          message.error(createResult.message || '创建对话失败');
          chatStore.isGenerating = false;
          return;
        }
      }
      
      // 获取最终的对话ID（可能是新创建的）
      const finalConversationId = conversationId || chatStore.currentConversation?.ID;
      
      // 生成消息ID (转换为int64)
      const messageUserID = parseInt(generateSnowflakeId().toString(), 10);
      const messageAssistantID = parseInt(generateSnowflakeId().toString(), 10);
      
      const messageData = {
        prompt: content,
        conversationID: parseInt(finalConversationId, 10),
        model: selectedModel.value,
        messageUserID: messageUserID,
        messageAssistantID: messageAssistantID,
        reasoning: isReasoning.value || (currentModel.value && currentModel.value.reasoning === currentModel.value.id)
      }
      
      // 开始自动滚动
      isAutoScrolling.value = true
      showScrollToBottomButton.value = false
      
      // 滚动到底部
      scrollToBottom()

      try {
        // 设置生成状态
        chatStore.isGenerating = true
        
        // 查找模型名称
        const currentModel = chatStore.models.find(model => model.id === selectedModel.value);
        const modelName = currentModel ? currentModel.name : selectedModel.value;
        
        // 添加用户消息到本地状态
        const userMessage = {
          id: messageUserID.toString(), // 使用生成的雪花ID
          content: content,
          role: 'user',
          createdAt: new Date().toISOString()
        }
        chatStore.messages.push(userMessage)

        // 添加AI消息占位符（包含模型信息）
        const aiMessage = {
          id: messageAssistantID.toString(), // 使用生成的雪花ID
          content: `<model=${selectedModel.value}>`, // 添加模型标签
          role: 'assistant',
          createdAt: new Date().toISOString(),
          isStreaming: true
        }
        chatStore.messages.push(aiMessage)
        
        // 使用流式发送
        let accumulatedContent = `<model=${selectedModel.value}>`
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
        // 获取当前对话ID
        const conversationId = chatStore.currentConversation?.ID;
        if (!conversationId) {
          message.error('无法获取当前对话ID');
          return;
        }
        
        // 调用停止生成接口，传递对话ID
        await chatApi.stopGeneration({ conversationID: parseInt(conversationId, 10) });
        // 更新状态
        chatStore.isGenerating = false;
        
        // 移除流式标记
        const lastMessage = chatStore.messages[chatStore.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.isStreaming = false;
        }
        
        message.info('已停止生成');
      } catch (error) {
        console.error('停止生成失败:', error);
        message.error('停止失败: ' + (error.message || '未知错误'));
      }
    }

    /**
     * 处理文件上传
     */
    const handleFileUpload = () => {
      message.info('文件上传功能开发中...')
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
    const handleShareChat = () => {
      // 触发事件，让父组件处理分享逻辑
      emit('share')
    }
    
    /**
     * 处理分享消息
     */
    const handleShareMessage = (message) => {
      // 触发事件，让父组件处理分享逻辑
      emit('share', message)
    }

    /**
     * 处理快捷操作
     * @param {string} text - 操作文本
     */
    const handleQuickAction = (text) => {
      // 这个方法现在不需要了，因为输入组件已经独立出去
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
          
          // 生成消息ID (转换为int64)
          const messageUserID = parseInt(generateSnowflakeId().toString(), 10);
          const messageAssistantID = parseInt(generateSnowflakeId().toString(), 10);
          
          const messageData = {
            prompt: userMessage.content,
            conversationID: parseInt(conversationId, 10),
            model: selectedModel.value,
            messageUserID: messageUserID,
            messageAssistantID: messageAssistantID,
            reasoning: isReasoning.value || (currentModel.value && currentModel.value.reasoning === currentModel.value.id)
          }
          
          try {
            // 设置生成状态
            chatStore.isGenerating = true

            // 查找模型名称
            const currentModel = chatStore.models.find(model => model.id === selectedModel.value);
            const modelName = currentModel ? currentModel.name : selectedModel.value;
            
            // 添加AI消息占位符（包含模型信息）
            const aiMessage = {
              id: messageAssistantID.toString(),
              content: `<model=${selectedModel.value}>`, // 添加模型标签
              role: 'assistant',
              createdAt: new Date().toISOString(),
              isStreaming: true
            }
            chatStore.messages.push(aiMessage)
            
            // 使用流式发送
            let accumulatedContent = `<model=${selectedModel.value}>`
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

    /**
     * 处理复制消息
     * @param {Object} msg - 消息对象
     */
    const handleCopyMessage = (msg) => {
      navigator.clipboard.writeText(msg.content)
      message.success('消息已复制')
    }
    
    /**
     * 切换推理模式
     */
    const toggleReasoning = () => {
      // 如果当前模型的 reasoning 字段等于模型 ID，表示只支持推理，不能切换
      if (currentModel.value && currentModel.value.reasoning === currentModel.value.id) {
        return
      }
      
      isReasoning.value = !isReasoning.value
    }
    
    /**
     * 检查是否需要显示滚动到底部按钮
     */
    const checkScrollPosition = () => {
      if (!messagesContainer.value) return
      
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      
      // 如果用户滚动到顶部或附近，停止自动滚动
      if (isAutoScrolling.value && !isAtBottom) {
        isAutoScrolling.value = false
      }
      
      // 如果不在底部，显示滚动到底部按钮
      showScrollToBottomButton.value = !isAtBottom
    }
    
    /**
     * 处理滚动事件
     */
    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      
      scrollTimeout = setTimeout(() => {
        checkScrollPosition()
      }, 100)
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
      
      // 添加滚动事件监听器
      if (messagesContainer.value) {
        messagesContainer.value.addEventListener('scroll', handleScroll)
      }
    })
    
    // 组件卸载时清理事件监听器
    onUnmounted(() => {
      if (messagesContainer.value) {
        messagesContainer.value.removeEventListener('scroll', handleScroll)
      }
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    })

    return {
      messagesContainer,
      messagesList,
      messages,
      isGenerating,
      selectedModel,
      selectedModelName,
      userInfo,
      models,
      hasStreamingMessage,
      quickActions,
      isReasoning,
      showReasoningButton,
      isReasoningDisabled,
      isReasoningActive,
      showScrollToBottomButton,
      showModelDropdown,
      handleSendMessage,
      handleStopGeneration,
      handleFileUpload,
      handleModelChange,
      handleClearChat,
      handleShareChat,
      handleShareMessage,
      handleQuickAction,
      handleRegenerateMessage,
      handleDeleteMessage,
      handleCopyMessage,
      toggleReasoning,
      scrollToBottomAndHideButton,
      toggleModelDropdown,
      closeModelDropdown,
      selectModel
    }
  }
}
</script>

<style scoped>
.chat-area {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f8f9fa;
  position: relative;
}

.model-selection-header {
  display: flex;
  align-items: center;
  padding: 16px 20px 0 20px;
  background-color: #fafafa;
  border-radius: 0 0 20px 20px;
  height: 80px;
  position: relative;
}

.model-selection-wrapper {
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
}

.model-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

/* 自定义模型选择下拉框 */
.aurora-model-select {
  width: 300px;
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  background-color: transparent;
  transition: background-color 0.2s;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 1001; /* 确保在下拉列表之上 */
}

.aurora-model-select:hover {
  background-color: #f0f0f0;
}

.selected-model {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.model-name {
  font-size: 14px;
  color: #333;
  flex-grow: 1;
  text-align: left;
}

.dropdown-icon {
  transition: transform 0.3s ease;
  color: #666;
  margin-left: 8px;
}

.dropdown-icon.rotated {
  transform: rotate(180deg);
}

/* 模型下拉列表 */
.model-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 300px;
  max-height: 300px;
  overflow-y: auto;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 4px;
}

.model-option {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.model-option:last-child {
  border-bottom: none;
}

.model-option:hover {
  background-color: #f5f5f5;
}

.model-main-info {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.model-main-info .model-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.model-extra-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.model-capability {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
}

.model-capability.reasoning {
  background-color: #409eff;
}

.model-capability.image {
  background-color: #67c23a;
}

.model-points {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f0f0f0;
  color: #666;
}

.user-avatar {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
  position: relative;
}

.messages-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px 0;
  background-color: #f8f9fa;
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

/* 滚动到底部按钮 */
.scroll-to-bottom-button {
  position: absolute;
  bottom: 110px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.scroll-to-bottom-button.visible {
  opacity: 1;
  visibility: visible;
}

.scroll-to-bottom-button :deep(.n-button) {
  width: 40px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

.scroll-to-bottom-button :deep(.n-button):hover {
  background-color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .model-selection-header {
    padding: 12px 16px 0 16px;
  }
  
  .aurora-model-select,
  .model-dropdown {
    width: 200px;
  }
  
  .messages-container {
    padding: 0 16px;
  }
  
  .messages-list {
    padding: 16px 0;
  }

  .scroll-to-bottom-button {
    bottom: 100px;
  }
}
</style>