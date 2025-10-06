<template>
  <div class="input-area">
    <div class="input-container">
      <n-input
        v-model:value="inputMessage"
        type="textarea"
        placeholder="询问任何问题"
        :autosize="{ minRows: 3, maxRows: 6 }"
        :disabled="isGenerating"
        @keydown="handleKeydown"
        ref="inputRef"
        class="message-input"
      />
      
      <div class="input-addons">
        <!-- 文件上传按钮 -->
        <n-button
          quaternary
          circle
          size="small"
          class="addon-button"
          @click="handleFileUpload"
        >
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon>
                <Plus />
              </n-icon>
            </template>
            <span>上传文件</span>
          </n-tooltip>
        </n-button>
        
        <!-- 推理按钮 -->
        <n-button
          quaternary
          size="small"
          class="reasoning-button"
          :type="isReasoning ? 'primary' : 'default'"
          :disabled="isReasoningDisabled"
          v-if="showReasoningButton"
          @click="toggleReasoning"
        >
          <n-icon>
            <Bulb />
          </n-icon>
          <span>推理</span>
        </n-button>
      </div>
      
      <div class="input-actions">
        <!-- 停止生成/发送按钮 -->
        <n-button
          v-if="isGenerating"
          quaternary
          circle
          size="small"
          @click="handleStopGeneration"
        >
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon>
                <Square />
              </n-icon>
            </template>
            <span>停止生成</span>
          </n-tooltip>
        </n-button>
        
        <n-button
          v-else
          type="primary"
          circle
          size="small"
          :disabled="!inputMessage.trim() || isGenerating"
          @click="handleSendMessage"
        >
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon>
                <Send />
              </n-icon>
            </template>
            <span>发送消息</span>
          </n-tooltip>
        </n-button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { 
  NInput, 
  NButton, 
  NIcon, 
  NTooltip,
  useMessage
} from 'naive-ui'
import { 
  Send, 
  Square,
  Plus,
  Bulb
} from '@vicons/tabler'

export default {
  name: 'ChatInput',
  components: {
    NInput,
    NButton,
    NIcon,
    NTooltip,
    Send,
    Square,
    Plus,
    Bulb
  },
  props: {
    isGenerating: {
      type: Boolean,
      default: false
    },
    isReasoning: {
      type: Boolean,
      default: false
    },
    isReasoningDisabled: {
      type: Boolean,
      default: false
    },
    showReasoningButton: {
      type: Boolean,
      default: true
    }
  },
  emits: ['sendMessage', 'stopGeneration', 'toggleReasoning', 'fileUpload'],
  setup(props, { emit }) {
    const message = useMessage()
    const inputMessage = ref('')
    const inputRef = ref(null)

    const handleSendMessage = () => {
      const content = inputMessage.value.trim()
      if (!content || props.isGenerating) return
      
      emit('sendMessage', content)
      inputMessage.value = ''
    }

    const handleStopGeneration = () => {
      emit('stopGeneration')
    }

    const handleFileUpload = () => {
      emit('fileUpload')
    }

    const toggleReasoning = () => {
      emit('toggleReasoning')
    }

    /**
     * 处理键盘事件
     * @param {KeyboardEvent} event - 键盘事件
     */
    const handleKeydown = (event) => {
      // Enter 发送消息，Shift+Enter 换行
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleSendMessage()
      }
      // Shift+Enter 默认行为就是换行，不需要额外处理
    }

    return {
      inputMessage,
      inputRef,
      handleKeydown,
      handleSendMessage,
      handleStopGeneration,
      handleFileUpload,
      toggleReasoning
    }
  }
}
</script>

<style scoped>
.input-area {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  background-color: transparent;
  border-radius: 20px 20px 0 0;
}

.input-container {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.message-input {
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  padding: 8px 120px 8px 48px;
}

.message-input :deep(.n-input__textarea-el) {
  padding-right: 120px;
  padding-left: 40px;
  text-align: left;
}

.input-addons {
  position: absolute;
  left: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.addon-button,
.reasoning-button {
  height: 32px;
}

.reasoning-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border-radius: 16px;
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
  .input-area {
    padding: 12px 16px;
  }
  
  .message-input :deep(.n-input__textarea-el) {
    padding-right: 100px;
  }
}
</style>