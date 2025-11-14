<template>
  <div class="input-area-container">
    <div class="input-area-wrapper">
      <div class="input-container-wrapper">
        <div class="input-container">
          <Textarea
            v-model="inputMessage"
            @keydown="handleKeydown"
            placeholder="询问任何问题"
            :disabled="isGenerating"
            class="message-input"
            rows="3"
            ref="inputRef"
          />

          <!-- 左下角按钮组 -->
          <div class="input-button-group-left">
            <!-- 文件上传按钮 -->
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="input-addon-button"
                    @click="handleFileUpload"
                  >
                    <Plus class="icon-small" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>上传文件</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <!-- 推理按钮 -->
            <TooltipProvider v-if="showReasoningButton">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    :class="['input-addon-button', 'reasoning-button']"
                    :disabled="isReasoningDisabled"
                    @click="toggleReasoning"
                  >
                    <Lightbulb class="icon-small" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>推理</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <!-- 右下角发送/停止按钮 -->
          <div class="input-button-group-right">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    v-if="isGenerating"
                    @click="handleStopGeneration"
                    variant="ghost"
                    size="icon"
                    class="input-send-button"
                  >
                    <Square class="icon-small" />
                  </Button>
                  <Button
                    v-else
                    @click="handleSendMessage"
                    variant="ghost"
                    size="icon"
                    :disabled="!inputMessage.trim() || isGenerating"
                    class="input-send-button"
                  >
                    <Send class="icon-small" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p v-if="isGenerating">停止生成</p>
                  <p v-else>发送消息</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Plus, Lightbulb, Square, Send } from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';

// 引入其他可能需要的API函数
import { generate, stopGenerate } from '@/api/chat';

// 响应式数据
const inputMessage = ref('');
const isGenerating = ref(false);
const isReasoning = ref(false);
const inputRef = ref<HTMLElement | null>(null);

// 计算属性
const showReasoningButton = computed(() => {
  const chatStore = useChatStore();
  // 如果当前选中的模型支持推理，则显示推理按钮
  const currentModel = chatStore.currentModel;
  return currentModel?.reasoning === true;
});

const isReasoningDisabled = computed(() => {
  return !inputMessage.value.trim() || isGenerating.value;
});

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
};

// 处理发送消息
const handleSendMessage = async () => {
  if (!inputMessage.value.trim() || isGenerating.value) return;

  isGenerating.value = true;

  try {
    // 在实际应用中，这里会调用发送消息的API
    // 使用chatStore获取当前选中的模型ID
    const chatStore = useChatStore();

    console.log('发送消息:', inputMessage.value);
    console.log('推理模式:', isReasoning.value);

    // 这里会调用实际的消息发送API
    // 示例调用:
    // const response = await generate({
    //   prompt: inputMessage.value,
    //   model: chatStore.selectedModel,
    //   reasoning: isReasoning.value,
    //   conversationID: currentConversationId
    // });

    // 模拟发送消息后清空输入框
    inputMessage.value = '';
  } catch (error) {
    console.error('发送消息失败:', error);
  } finally {
    isGenerating.value = false;
  }
};

// 处理停止生成
const handleStopGeneration = async () => {
  console.log('停止生成');
  isGenerating.value = false;

  try {
    // 调用API停止生成
    // 示例调用:
    // await stopGenerate({ conversationID: currentConversationId });
  } catch (error) {
    console.error('停止生成失败:', error);
  }
};

// 切换推理模式
const toggleReasoning = () => {
  if (isReasoningDisabled.value) return;
  isReasoning.value = !isReasoning.value;
};

// 处理文件上传
const handleFileUpload = () => {
  console.log('打开文件上传');
  // 在实际应用中，这里会打开文件选择对话框
  // 也可以通过ref来触发一个隐藏的input[type="file"]元素
};
</script>

<style scoped>
.input-area-container {
  padding: var(--input-area-horizontal-padding) var(--input-area-horizontal-padding) var(--input-area-bottom-padding);
}

.input-area-wrapper {
  max-width: var(--input-area-max-width);
  margin-left: auto;
  margin-right: auto;
}

.input-container-wrapper {
  border: 1px solid var(--color-gray-200); /* border border-gray-200 */
  border-radius: var(--input-container-border-radius);
  background-color: var(--color-white); /* bg-white */
}

.dark .input-container-wrapper {
  border-color: var(--color-gray-700); /* dark:border-gray-700 */
  background-color: var(--color-black); /* dark:bg-black */
}

.input-container {
  position: relative;
}

.message-input {
  width: 100%;
  max-width: var(--input-area-max-width); /* 设置最大宽度 */
  resize: none;
  outline: none;
  font-size: var(--input-text-size);
  max-height: var(--input-max-height);
  padding-right: var(--input-padding-right); /* 与右边按钮位置对齐 */
  padding-left: var(--input-padding-left); /* 与左边按钮位置对齐 */
  padding-bottom: var(--input-padding-bottom); /* 为底部按钮留出空间 */
  background-color: transparent;
  color: var(--color-gray-800); /* text-gray-800 */
}

.dark .message-input {
  color: var(--color-gray-200); /* dark:text-gray-200 */
}

.message-input:focus {
  outline: none;
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(0px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.input-button-group-left {
  position: absolute;
  left: var(--input-button-group-left);
  bottom: var(--input-button-group-bottom);
  display: flex;
  flex-direction: row;
  gap: var(--spacing-between-buttons);
}

.input-button-group-right {
  position: absolute;
  right: var(--input-button-group-left);
  bottom: var(--input-button-group-bottom);
}

.input-addon-button {
  height: var(--button-size);
  width: var(--button-size);
  background-color: transparent;
  border-radius: var(--border-radius-full); /* rounded-full */
}

.input-addon-button:hover {
  background-color: var(--color-gray-200); /* hover:bg-gray-200 */
}

.dark .input-addon-button:hover {
  background-color: var(--color-gray-700); /* dark:hover:bg-gray-700 */
}

.reasoning-button {
  background-color: v-bind(isReasoning ? 'var(--reasoning-button-bg)' : 'transparent');
  color: v-bind(isReasoning ? 'var(--reasoning-button-text)' : 'initial');
}

.reasoning-button:hover {
  background-color: v-bind(isReasoning ? 'var(--reasoning-button-hover-bg)' : '');
}

.message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reasoning-active {
  background-color: var(--reasoning-button-bg);
  color: var(--reasoning-button-text);
}

.reasoning-active:hover {
  background-color: var(--reasoning-button-hover-bg);
}

.input-send-button {
  height: var(--button-size);
  width: var(--button-size);
  background-color: transparent;
  border-radius: var(--border-radius-full); /* rounded-full */
}

.input-send-button:hover {
  background-color: var(--color-gray-200); /* hover:bg-gray-200 */
}

.dark .input-send-button:hover {
  background-color: var(--color-gray-700); /* dark:hover:bg-gray-700 */
}

.icon-small {
  height: var(--button-icon-size);
  width: var(--button-icon-size);
}
</style>