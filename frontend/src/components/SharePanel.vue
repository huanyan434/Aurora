<template>
  <div class="share-panel">
    <!-- 标题区域 -->
    <div class="panel-header">
      <h3>分享对话</h3>
    </div>

    <!-- 对话展示区域 -->
    <div class="messages-container">
      <div 
        v-for="message in messages" 
        :key="message.id"
        class="message-item"
        :class="{ 'user-message': message.role === 'user', 'assistant-message': message.role === 'assistant' }"
      >
        <n-checkbox 
          v-model:checked="selectedMessages[message.id]" 
          class="message-checkbox"
        />
        <div class="message-content-wrapper">
          <div class="message-header">
            <span class="message-role">{{ getMessageRole(message) }}</span>
            <span class="message-time">{{ formatTime(message.createdAt) }}</span>
          </div>
          <div class="message-content" v-html="formatMessageContent(message.content, message.role)"></div>
        </div>
      </div>
    </div>

    <!-- 底部选项区域 -->
    <div class="panel-footer">
      <n-checkbox 
        v-model:checked="selectAll" 
        label="全选"
        class="select-all-checkbox"
      />
      <div class="footer-buttons">
        <n-button @click="closePanel">取消</n-button>
        <n-button 
          type="primary" 
          @click="confirmShare"
          :disabled="selectedMessageIds.length === 0"
        >
          复制链接
        </n-button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { NButton, NIcon, NCheckbox, useMessage } from 'naive-ui'
import { marked } from 'marked'
import { useChatStore } from '@/stores/chat'

export default {
  name: 'SharePanel',
  components: {
    NButton,
    NIcon,
    NCheckbox
  },
  emits: ['close', 'shared'],
  setup(props, { emit }) {
    const message = useMessage()
    const chatStore = useChatStore()
    
    // 响应式数据
    const selectedMessages = ref({})
    const selectAll = ref(false)
    
    // 计算属性
    const messages = computed(() => {
      const msgs = chatStore.messages || []
      // 确保每条消息都有必要的属性
      return msgs.map(msg => ({
        id: msg.id || '',
        role: msg.role || 'user',
        content: msg.content || '',
        createdAt: msg.createdAt || new Date().toISOString()
      }))
    })
    
    const selectedMessageIds = computed(() => {
      return Object.keys(selectedMessages.value).filter(id => selectedMessages.value[id])
    })
    
    // 方法
    const closePanel = () => {
      emit('close')
    }
    
    const getMessageRole = (message) => {
      if (message.role === 'user') {
        return '你'
      }
      
      // 提取模型ID
      const extractModelId = (content) => {
        if (!content) return null
        const modelMatch = content.match(/<model=([^>]+)>/)
        return modelMatch ? modelMatch[1] : null
      }
      
      // 获取模型名称
      const getModelName = (modelId) => {
        if (!modelId) return 'Aurora'
        const models = chatStore.models || []
        const model = models.find(m => m.id === modelId)
        return model ? model.name : modelId
      }
      
      const modelId = extractModelId(message.content)
      return getModelName(modelId)
    }
    
    const formatTime = (timeString) => {
      if (!timeString) return ''
      
      const time = new Date(timeString)
      return time.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const formatMessageContent = (content, role) => {
      if (!content) return ''
      
      // 如果是用户消息，直接返回文本
      if (role === 'user') {
        return content.replace(/\n/g, '<br>')
      }
      
      // 移除模型标签
      let formattedContent = content.replace(/<model=[^>]+>/, '')
      
      // AI消息使用Markdown渲染
      try {
        return marked(formattedContent, {
          breaks: true,
          gfm: true
        })
      } catch (error) {
        console.error('Markdown渲染失败:', error)
        return formattedContent.replace(/\n/g, '<br>')
      }
    }
    
    const confirmShare = async () => {
      if (selectedMessageIds.value.length === 0) {
        message.warning('请至少选择一条消息')
        return
      }
      
      try {
        // 调用分享API
        const response = await chatStore.shareMessages(selectedMessageIds.value)
        
        if (response.success) {
          const shareUrl = `${window.location.origin}/share/${response.data.share_id}`
          await navigator.clipboard.writeText(shareUrl)
          message.success('分享链接已复制到剪贴板')
          emit('shared')
          closePanel()
        } else {
          message.error(response.message || '分享失败')
        }
      } catch (error) {
        console.error('分享对话失败:', error)
        message.error('分享对话失败')
      }
    }
    
    // 监听消息列表变化
    watch(messages, (newMessages) => {
      // 初始化选择状态
      const newSelectedMessages = {}
      newMessages.forEach(msg => {
        newSelectedMessages[msg.id] = !!selectedMessages.value[msg.id]
      })
      selectedMessages.value = newSelectedMessages
    }, { immediate: true })
    
    // 监听全选状态
    watch(selectAll, (newVal) => {
      const newSelectedMessages = {}
      messages.value.forEach(msg => {
        newSelectedMessages[msg.id] = newVal
      })
      selectedMessages.value = newSelectedMessages
    })
    
    // 监听选择状态变化
    watch(selectedMessages, (newVal) => {
      const selectedCount = Object.values(newVal).filter(Boolean).length
      selectAll.value = selectedCount > 0 && selectedCount === messages.value.length
    }, { deep: true })
    
    return {
      selectedMessages,
      selectAll,
      messages,
      selectedMessageIds,
      closePanel,
      getMessageRole,
      formatTime,
      formatMessageContent,
      confirmShare
    }
  }
}
</script>

<style scoped>
.share-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.message-item.user-message {
  background-color: #f5f9ff;
}

.message-item.assistant-message {
  background-color: #fafafa;
}

.message-checkbox {
  flex-shrink: 0;
  margin-top: 4px;
}

.message-content-wrapper {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.message-role {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.user-message .message-role {
  color: #2196f3;
}

.assistant-message .message-role {
  color: #4caf50;
}

.message-time {
  font-size: 12px;
  color: #999;
}

.message-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  word-wrap: break-word;
}

.message-content :deep(pre) {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-content :deep(code) {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  background-color: #fafafa;
}

.select-all-checkbox {
  font-size: 14px;
}

.footer-buttons {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .panel-header {
    padding: 12px 16px;
  }
  
  .messages-container {
    padding: 16px;
  }
  
  .message-item {
    gap: 8px;
    padding: 10px;
  }
  
  .panel-footer {
    padding: 12px 16px;
  }
}
</style>