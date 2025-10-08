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
        <!-- 推理内容 -->
        <div 
          v-if="reasoningContent"
          class="message-reasoning"
          :class="{ 'collapsed': isReasoningCollapsed }"
        >
          <div class="reasoning-header" @click="toggleReasoning">
            <span class="reasoning-time">思考耗时: {{ reasoningTime }}秒</span>
            <n-icon class="collapse-icon" :class="{ 'rotated': isReasoningCollapsed }">
              <ChevronDown />
            </n-icon>
          </div>
          <div v-if="!isReasoningCollapsed" class="reasoning-content" v-html="formattedReasoningContent"></div>
        </div>
        
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
import { computed, h, ref } from 'vue'
import { NAvatar, NButton, NIcon, NDropdown, useMessage } from 'naive-ui'
import { Copy, Refresh, Trash, Share, DotsVertical, ChevronDown } from '@vicons/tabler'
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
    DotsVertical,
    ChevronDown
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
    const isReasoningCollapsed = ref(false)

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

      // 首先在模型列表中查找完全匹配的模型
      const model = chatStore.models.find(m => m.id === modelId)
      if (model) {
        return model.name
      }
      
      // 如果在模型列表中没有找到完全匹配的模型，
      // 则检查所有模型的reasoning字段中是否有匹配的
      const foundInReasoning = chatStore.models.find(m => m.reasoning === modelId)
      // 如果在reasoning字段中找到了，则返回原始模型ID
      if (foundInReasoning) {
        return foundInReasoning.name
      }
      // 否则仍然返回原始模型ID
      return modelId
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

    // 提取推理内容
    const reasoningContent = computed(() => {
      if (!props.message.content || isUser.value) return null
      
      // 首先检查是否有独立的reasoning_content字段（历史消息）
      if (props.message.reasoning_content) {
        // 匹配所有<think time=x>标签中的内容并连接起来
        const thinkMatches = props.message.reasoning_content.matchAll(/<think time=(\d+)>([\s\S]*?)<\/think>/g)
        const contents = []
        let matchCount = 0;
        for (const match of thinkMatches) {
          matchCount++;
          contents.push(match[2])
        }
        
        if (contents.length > 0) {
          const result = contents.join('')
          return result;
        }
      }
      
      // 匹配所有<think time=x>标签中的内容并连接起来（流式消息）
      const thinkMatches = props.message.content.matchAll(/<think time=(\d+)>([\s\S]*?)<\/think>/g)
      const contents = []
      let matchCount = 0;
      for (const match of thinkMatches) {
        matchCount++;
        contents.push(match[2])
      }
      
      const result = contents.length > 0 ? contents.join('') : null;
      return result;
    })

    // 提取推理时间（使用最后一个推理时间）
    const reasoningTime = computed(() => {
      if (!props.message.content || isUser.value) return 0
      
      // 首先检查是否有独立的reasoning_content字段（历史消息）
      if (props.message.reasoning_content) {
        const thinkMatches = props.message.reasoning_content.matchAll(/<think time=(\d+)>([\s\S]*?)<\/think>/g)
        let lastTime = 0
        for (const match of thinkMatches) {
          lastTime = parseInt(match[1])
        }
        if (lastTime > 0) {
          return lastTime
        }
      }
      
      // 查找content中的推理时间（流式消息）
      const thinkMatches = props.message.content.matchAll(/<think time=(\d+)>([\s\S]*?)<\/think>/g)
      let lastTime = 0
      for (const match of thinkMatches) {
        lastTime = parseInt(match[1])
      }
      return lastTime
    })

    // 格式化推理内容
    const formattedReasoningContent = computed(() => {
      if (!reasoningContent.value) return ''
      try {
        return marked(reasoningContent.value, {
          breaks: true,
          gfm: true
        })
      } catch (error) {
        console.error('推理内容Markdown渲染失败:', error)
        return reasoningContent.value.replace(/\n/g, '<br>')
      }
    })

    // 切换推理内容折叠状态
    const toggleReasoning = () => {
      isReasoningCollapsed.value = !isReasoningCollapsed.value
    }

    // 格式化消息内容（移除推理内容）
    const formattedContent = computed(() => {
      if (!props.message.content) return ''
      
      // 如果是用户消息，直接返回文本
      if (isUser.value) {
        return props.message.content.replace(/\n/g, '<br>')
      }
      
      // 移除模型标签和推理内容
      let content = props.message.content.replace(/<model=[^>]+>/, '')
      
      // 如果有独立的reasoning_content字段，则直接使用content
      if (props.message.reasoning_content) {
        content = content
      } else {
        // 否则移除content中的推理内容
        content = content.replace(/<think time=(\d+)>([\s\S]*?)<\/think>/g)
      }
      
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
      reasoningContent,
      reasoningTime,
      formattedReasoningContent,
      isReasoningCollapsed,
      toggleReasoning,
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

/* 推理内容区域 */
.message-reasoning {
  background-color: #f1f5f9;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 3px solid #94a3b8;
}

.reasoning-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
}

.reasoning-time {
  font-weight: 500;
}

.collapse-icon {
  transition: transform 0.3s ease;
}

.collapse-icon.rotated {
  transform: rotate(180deg);
}

.reasoning-content {
  padding: 0 12px 8px 12px;
  font-size: 14px;
  color: #475569;
  border-top: 1px solid #e2e8f0;
}

.message-reasoning.collapsed .reasoning-content {
  display: none;
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