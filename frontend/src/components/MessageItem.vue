<template>
  <div class="message-item" :class="{ 'user-message': isUser, 'assistant-message': !isUser }">
    <div class="message-avatar">
      <n-avatar
        :size="32"
        :src="avatarSrc"
        :fallback-src="fallbackAvatar"
      >
        {{ avatarText }}
      </n-avatar>
    </div>
    
    <div class="message-content">
      <div class="message-header">
        <span class="message-role">{{ roleName }}</span>
        <span class="message-time">{{ formatTime(message.timestamp) }}</span>
      </div>
      
      <div class="message-body">
        <div 
          class="message-text"
          :class="{ 'streaming': message.isStreaming }"
          v-html="formattedContent"
        ></div>
        
        <!-- 流式输入指示器 -->
        <div v-if="message.isStreaming" class="streaming-indicator">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
      
      <div class="message-actions" v-if="!message.isStreaming">
        <n-button
          quaternary
          size="small"
          @click="handleCopy"
          title="复制"
        >
          <template #icon>
            <n-icon>
              <Copy />
            </n-icon>
          </template>
        </n-button>
        
        <n-button
          v-if="!isUser"
          quaternary
          size="small"
          @click="handleRegenerate"
          title="重新生成"
        >
          <template #icon>
            <n-icon>
              <Refresh />
            </n-icon>
          </template>
        </n-button>
        
        <n-button
          quaternary
          size="small"
          @click="handleDelete"
          title="删除"
        >
          <template #icon>
            <n-icon>
              <Trash2 />
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { NAvatar, NButton, NIcon, useMessage } from 'naive-ui'
import { Copy, Refresh, Trash2 } from '@vicons/tabler'
import { marked } from 'marked'
import { useUserStore } from '@/stores/user'

export default {
  name: 'MessageItem',
  components: {
    NAvatar,
    NButton,
    NIcon,
    Copy,
    Refresh,
    Trash2
  },
  props: {
    /**
     * 消息数据
     */
    message: {
      type: Object,
      required: true
    }
  },
  emits: ['copy', 'regenerate', 'delete'],
  setup(props, { emit }) {
    const message = useMessage()
    const userStore = useUserStore()

    // 是否为用户消息
    const isUser = computed(() => props.message.role === 'user')

    // 角色名称
    const roleName = computed(() => {
      return isUser.value ? '你' : 'Aurora'
    })

    // 头像源
    const avatarSrc = computed(() => {
      if (isUser.value) {
        return userStore.userInfo?.avatar || ''
      }
      return '/aurora-avatar.png' // AI助手头像
    })

    // 备用头像
    const fallbackAvatar = computed(() => {
      return isUser.value ? '/user-avatar.png' : '/aurora-avatar.png'
    })

    // 头像文字
    const avatarText = computed(() => {
      if (isUser.value) {
        return userStore.userInfo?.username?.charAt(0).toUpperCase() || 'U'
      }
      return 'A'
    })

    // 格式化消息内容
    const formattedContent = computed(() => {
      if (!props.message.content) return ''
      
      // 如果是用户消息，直接返回文本
      if (isUser.value) {
        return props.message.content.replace(/\n/g, '<br>')
      }
      
      // AI消息使用Markdown渲染
      try {
        return marked(props.message.content, {
          breaks: true,
          gfm: true
        })
      } catch (error) {
        console.error('Markdown渲染失败:', error)
        return props.message.content.replace(/\n/g, '<br>')
      }
    })

    /**
     * 格式化时间显示
     * @param {string} timeString - 时间字符串
     * @returns {string} 格式化后的时间
     */
    const formatTime = (timeString) => {
      if (!timeString) return ''
      
      const time = new Date(timeString)
      return time.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    /**
     * 处理复制消息
     */
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(props.message.content)
        message.success('已复制到剪贴板')
        emit('copy', props.message)
      } catch (error) {
        message.error('复制失败')
      }
    }

    /**
     * 处理重新生成
     */
    const handleRegenerate = () => {
      emit('regenerate', props.message)
    }

    /**
     * 处理删除消息
     */
    const handleDelete = () => {
      emit('delete', props.message)
    }

    return {
      isUser,
      roleName,
      avatarSrc,
      fallbackAvatar,
      avatarText,
      formattedContent,
      formatTime,
      handleCopy,
      handleRegenerate,
      handleDelete
    }
  }
}
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.message-item:last-child {
  border-bottom: none;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
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

.message-body {
  position: relative;
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  word-wrap: break-word;
}

.message-text.streaming {
  position: relative;
}

.streaming-indicator {
  display: inline-block;
  margin-left: 4px;
}

.typing-dots {
  display: inline-flex;
  gap: 2px;
}

.typing-dots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #999;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message-item:hover .message-actions {
  opacity: 1;
}

/* Markdown样式 */
.message-text :deep(pre) {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-text :deep(code) {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.message-text :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 12px;
  margin: 8px 0;
  color: #666;
}

.message-text :deep(ul), .message-text :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}

.message-text :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.message-text :deep(th), .message-text :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.message-text :deep(th) {
  background-color: #f5f5f5;
}

@media (max-width: 768px) {
  .message-item {
    gap: 8px;
    padding: 12px 0;
  }
  
  .message-actions {
    opacity: 1;
  }
}
</style>