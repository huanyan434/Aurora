<template>
  <div class="input-area">
    <div class="input-container">
      <textarea
        v-model="inputMessage"
        placeholder="询问任何问题"
        :disabled="isGenerating"
        @keydown="handleKeydown"
        ref="inputRef"
        class="message-input"
      ></textarea>
      
      <div class="input-addons">
        <!-- 文件上传按钮 -->
        <button
          class="addon-button"
          @click="handleFileUpload"
        >
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon size="20">
                <Plus />
              </n-icon>
            </template>
            <span>上传文件</span>
          </n-tooltip>
        </button>
        
        <!-- 推理按钮 -->
        <button
          class="reasoning-button"
          :class="{ 'active': isReasoning }"
          :disabled="isReasoningDisabled"
          v-if="showReasoningButton"
          @click="toggleReasoning"
        >
          <n-icon size="20">
            <Bulb />
          </n-icon>
          <span>推理</span>
        </button>
      </div>
      
      <div class="input-actions">
        <!-- 停止生成/发送按钮 -->
        <button
          v-if="isGenerating"
          class="stop-button"
          @click="handleStopGeneration"
        >
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon size="20">
                <Square />
              </n-icon>
            </template>
            <span>停止生成</span>
          </n-tooltip>
        </button>
        
        <button
          v-else
          class="send-button"
          :disabled="!inputMessage.trim() || isGenerating"
          @click="handleSendMessage"
        >
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon size="20">
                <Send />
              </n-icon>
            </template>
            <span>发送消息</span>
          </n-tooltip>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { 
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
  emits: ['sendMessage', 'stopGeneration', 'toggleReasoning', 'fileUpload', 'update:inputMessage'],
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
  background-color: transparent;
}

.input-container {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.message-input {
  width: 100%;
  min-height: 80px;
  max-height: 200px;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 20px;
  padding: 12px 120px 12px 48px;
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
}

.message-input:focus {
  outline: none;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
}

.input-addons {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.addon-button,
.reasoning-button,
.stop-button,
.send-button {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.addon-button:hover,
.stop-button:hover,
.send-button:not(:disabled):hover {
  background-color: #f0f0f0;
}

.send-button:not(:disabled) {
  background-color: #18a058;
  color: white;
}

.send-button:not(:disabled):hover {
  background-color: #28c76f;
}

.stop-button {
  background-color: #e74c3c;
  color: white;
}

.stop-button:hover {
  background-color: #c0392b;
}

.reasoning-button {
  height: 32px;
  border: none;
  border-radius: 16px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  font-size: 14px;
  transition: all 0.2s ease;
  white-space: nowrap;
  width: 75px;
}

.reasoning-button:hover {
  background-color: #f0f0f0;
}

.reasoning-button.active {
  background-color: #18a058;
  color: white;
}

.reasoning-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reasoning-button.active:hover {
  background-color: #28c76f;
}

.input-actions {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .input-area {
    padding: 12px 16px;
  }
}
</style>