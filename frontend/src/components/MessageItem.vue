<template>
  <div class="message-item" :class="{ 'user-message': isUser, 'assistant-message': !isUser }">
    <div class="message-avatar" v-if="!isUser">
      <n-avatar
        :size="40"
        :src="avatarSrc"
        :fallback-src="fallbackAvatar"
        round
      >
        {{ avatarText }}
      </n-avatar>
    </div>
    
    <div class="message-content">
      <div class="message-header" v-if="!isUser">
        <span class="message-role">{{ roleName }}</span>
      </div>
      
      <div class="message-body">
        <div 
          class="message-text"
          :class="{ 'streaming': message.isStreaming, 'user-message-text': isUser }"
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
        >
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon :size="20">
                <Copy />
              </n-icon>
            </template>
            <span>复制</span>
          </n-tooltip>
        </n-button>
        
        <n-dropdown 
          :options="actionOptions" 
          @select="handleActionSelect"
          trigger="click"
          size="small"
        >
          <n-button quaternary size="small" class="more-actions-button">
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-icon :size="20">
                  <DotsVertical />
                </n-icon>
              </template>
              <span>更多操作</span>
            </n-tooltip>
          </n-button>
        </n-dropdown>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, h } from 'vue'
import { NAvatar, NButton, NIcon, NDropdown, useMessage } from 'naive-ui'
import { Copy, Refresh, Trash, Share, DotsVertical } from '@vicons/tabler'
import { marked } from 'marked'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'

export default {
  name: 'MessageItem',
  components: {
    NAvatar,
    NButton,
    NIcon,
    NDropdown,
    Copy,
    Refresh,
    Trash,
    Share,
    DotsVertical
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
  emits: ['copy', 'regenerate', 'delete', 'share'],
  setup(props, { emit }) {
    const message = useMessage()
    const userStore = useUserStore()
    const chatStore = useChatStore()

    // 是否为用户消息
    const isUser = computed(() => props.message.role === 'user')

    // 提取模型ID
    const extractModelId = (content) => {
      if (!content) return null
      const modelMatch = content.match(/<model=([^>]+)>/)
      return modelMatch ? modelMatch[1] : null
    }

    // 获取模型名称
    const getModelName = (modelId) => {
      if (!modelId) return 'Aurora'
      const model = chatStore.models.find(m => m.id === modelId)
      return model ? model.name : modelId
    }

    // 角色名称
    const roleName = computed(() => {
      if (isUser.value) {
        return '你'
      } else {
        const modelId = extractModelId(props.message.content)
        return getModelName(modelId)
      }
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
      // 对于AI消息，使用模型名称的首字母
      const modelId = extractModelId(props.message.content)
      const modelName = getModelName(modelId)
      return modelName?.charAt(0).toUpperCase() || 'A'
    })

    // 格式化消息内容
    const formattedContent = computed(() => {
      if (!props.message.content) return ''
      
      // 如果是用户消息，直接返回文本
      if (isUser.value) {
        return props.message.content.replace(/\n/g, '<br>')
      }
      
      // 移除模型标签
      let content = props.message.content.replace(/<model=[^>]+>/, '')
      
      // AI消息使用Markdown渲染
      try {
        return marked(content, {
          breaks: true,
          gfm: true
        })
      } catch (error) {
        console.error('Markdown渲染失败:', error)
        return content.replace(/\n/g, '<br>')
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
     * 操作选项
     */
    const actionOptions = computed(() => {
      const options = [
        {
          label: "分享",
          key: "share",
          icon: () => h(NIcon, null, { default: () => h(Share) })
        }
      ];
      
      if (!isUser.value) {
        options.unshift({
          label: "重新生成",
          key: "regenerate",
          icon: () => h(NIcon, null, { default: () => h(Refresh) })
        });
      }
      
      options.push({
        label: "删除",
        key: "delete",
        icon: () => h(NIcon, null, { default: () => h(Trash) })
      });
      
      return options;
    });

    /**
     * 处理操作选择
     */
    const handleActionSelect = (key) => {
      switch (key) {
        case 'share':
          handleShare();
          break;
        case 'regenerate':
          handleRegenerate();
          break;
        case 'delete':
          handleDelete();
          break;
      }
    };

    /**
     * 处理复制消息
     */
    const handleCopy = async () => {
      try {
        // 复制时不包含模型标签
        let contentToCopy = props.message.content
        if (!isUser.value) {
          contentToCopy = contentToCopy.replace(/<model=[^>]+>/, '')
        }
        await navigator.clipboard.writeText(contentToCopy)
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
    
    /**
     * 处理分享消息
     */
    const handleShare = () => {
      emit('share', props.message)
    }

    return {
      isUser,
      roleName,
      avatarSrc,
      fallbackAvatar,
      avatarText,
      formattedContent,
      formatTime,
      actionOptions,
      handleActionSelect,
      handleCopy,
      handleRegenerate,
      handleDelete,
      handleShare
    }
  }
}
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 12px;
}

.message-item.user-message {
  flex-direction: row-reverse;
}

.message-item.assistant-message {
  flex-direction: row;
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

.assistant-message .message-role {
  font-size: 14px;
  font-weight: 600;
  color: #4caf50;
}

.message-body {
  position: relative;
}

.user-message .message-body {
  background-color: #ffffff;
  padding: 8px;
  border-radius: 12px;
  display: table;
  max-width: 80%;
  margin-left: auto;
  text-align: right;
}

.message-text {
  font-size: 16px;
  line-height: 1.6;
  color: #2a2424;
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

.user-message .message-actions {
  justify-content: flex-end;
}

.message-item:hover .message-actions {
  opacity: 1;
}

.message-actions :deep(.n-button) {
  width: 36px;
  height: 36px;
  padding: 0;
}

.more-actions-button {
  width: 36px;
  height: 36px;
  padding: 0;
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
  }
  
  .message-actions {
    opacity: 1;
  }
  
  .assistant-message .message-body {
    max-width: 90%;
  }
}
</style>