<template>
  <div class="input-area-container">
    <div class="input-area-wrapper">
      <!-- 图片预览区域 -->
      <div v-if="attachment" class="image-preview-container">
        <div class="image-wrapper">
          <img :src="attachment" alt="预览图片" class="image-preview" />
          <button @click="removeAttachment" class="remove-image-btn" type="button">
            <X class="remove-icon" />
          </button>
        </div>
      </div>

      <textarea v-model="inputMessage" @keydown="handleKeydown" placeholder="询问任何问题" rows="3" ref="inputRef"
        id="message-input"></textarea>

      <!-- 左下角按钮组 -->
      <div class="input-button-group-left">
        <!-- 文件上传按钮 -->
        <Button variant="ghost" size="icon" class="input-addon-button input-upload-button" @click="triggerFileUpload">
          <Paperclip class="icon-small" />
        </Button>

        <!-- 隐藏的文件输入框 -->
        <input type="file" ref="fileInputRef" @change="handleFileSelect" accept="image/*" style="display: none" />

        <!-- 推理按钮 -->
        <Button variant="ghost" size="icon"
          :class="['input-addon-button', 'reasoning-button', { 'reasoning-button-active': isReasoning } ]"
          :disabled="isReasoningDisabled" @click="toggleReasoning">
          <Lightbulb class="icon-small" />
          <span class="reasoning-text">推理</span>
        </Button>
      </div>

      <!-- 右下角发送/停止按钮 -->
      <div class="input-button-group-right">
        <Button v-if="isTyping" @click="handleStopGeneration" variant="ghost" size="icon"
          class="input-send-button input-send-button-stop">
          <Square class="icon-small" />
        </Button>
        <Button v-else @click="handleSendMessage" variant="ghost" size="icon" :disabled="!canSendMessage"
          class="input-send-button">
          <Send class="icon-small" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Paperclip, Lightbulb, Square, Send, X } from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';
import { generateSnowflakeId } from '@/utils/snowflake';
import { newConversation, wsManager } from '@/api/chat';
import type { Model } from '@/stores/chat';

// 响应式数据
const inputMessage = ref('');
// 使用store中的isGenerating状态
const isGenerating = computed(() => chatStore.getIsGenerating);
// 使用store中的isTyping状态（用于控制停止/发送按钮）
const isTyping = computed(() => chatStore.getIsTyping);
const isReasoning = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const attachment = ref<string>(''); // 存储base64编码的图片
const chatStore = useChatStore();
const route = useRoute();
const router = useRouter();

const focusInput = async () => {
  await nextTick();
  inputRef.value?.focus();
};

const focusAndClearInput = async () => {
  inputMessage.value = '';
  attachment.value = '';
  await focusInput();
};

const isReasoningDisabled = computed(() => {
  // 获取当前模型列表
  const modelList: Model[] = chatStore.models;
  const selectedModel = chatStore.selectedModel;

  // 获取当前选中的模型
  const currentModel = modelList.find(model => model.id === selectedModel);

  // 如果新模型不支持推理，禁用推理模式
  if (currentModel) {
    if (!currentModel.reasoning) {
      isReasoning.value = false;
    } else if (currentModel.reasoning === currentModel.id) {
      isReasoning.value = true;
    } else {
      isReasoning.value = false;
      return false;
    }
  } else {
    isReasoning.value = false;
  }
  return true;
});

// 判断是否可以发送消息
const canSendMessage = computed(() => {
  return (inputMessage.value.trim() || attachment.value) && !isGenerating.value;
});

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
};

// 触发文件上传
const triggerFileUpload = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      console.error('只支持图片文件');
      return;
    }

    // 转换为base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      attachment.value = result;
      console.log('文件已转换为base64');
    };
    reader.readAsDataURL(file);
  }

  // 清空input值，允许重复选择同一文件
  target.value = '';
};

// 移除附件
const removeAttachment = () => {
  attachment.value = '';
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

// 处理发送消息（使用 WebSocket）
const handleSendMessage = async () => {
  if (!canSendMessage.value) return;

  // 设置 store 中的 isGenerating 和 isTyping 状态
  chatStore.setIsGenerating(true);
  chatStore.setIsTyping(true);

  try {
    // 获取当前对话 ID
    let conversationId: number | null = null;

    // 检查是否是根路由
    const isHomeRoute = route.path === '/';

    if (isHomeRoute) {
      // 创建新对话
      const response = await newConversation();
      if (response.data.success) {
        conversationId = parseInt(response.data.conversationID);
        // 跳转到新对话页面
        await router.push(`/c/${conversationId}?type=2`);
        // 刷新对话列表
        await chatStore.fetchConversations();
      } else {
        throw new Error('创建新对话失败');
      }
    } else {
      // 从路由参数获取对话 ID
      const routeParams = route.params.conversationId;
      if (typeof routeParams === 'string') {
        conversationId = parseInt(routeParams);
      } else if (Array.isArray(routeParams) && routeParams.length > 0) {
        // 修复类型检查问题
        const param = routeParams[0];
        if (param !== undefined) {
          conversationId = parseInt(param);
        }
      }
    }

    if (!conversationId) {
      throw new Error('无法确定对话 ID');
    }

    // 生成 snowflake ID
    const messageUserId = Number(generateSnowflakeId());
    const messageAssistantId = Number(generateSnowflakeId());

    // 准备请求参数
    const requestData = {
      conversationID: conversationId,
      messageUserID: messageUserId,
      messageAssistantID: messageAssistantId,
      prompt: inputMessage.value,
      model: chatStore.selectedModel,
      base64: attachment.value,
      reasoning: isReasoning.value
    };

    // 保存用户消息到临时变量
    const userMessage = {
      content: inputMessage.value,
      base64: attachment.value
    };

    // 清空输入框和附件
    inputMessage.value = '';
    attachment.value = '';

    // 添加用户消息到聊天记录
    chatStore.addMessage(conversationId, {
      id: messageUserId,
      role: 'user',
      content: userMessage.content,
      base64: userMessage.base64,
      conversationID: conversationId,
      createdAt: new Date().toISOString()
    });

    // 添加占位助手消息，带有加载占位符
    chatStore.addMessage(conversationId, {
      id: messageAssistantId,
      role: 'assistant',
      content: '',
      conversationID: conversationId,
      createdAt: new Date().toISOString(),
      isStreaming: true, // 立即设置为流式传输状态
      disableTyping: false, // 流式消息需要打字效果
    });

    // 发送新消息后强制滚动到底部
    // 需要等待 DOM 更新后再滚动
    await nextTick();
    // 通过事件通知上层强制滚动，并传递本次发送的对话和消息 ID
    window.dispatchEvent(new CustomEvent('force-scroll-to-bottom', {
      detail: {
        conversationID: conversationId,
        messageAssistantID: messageAssistantId,
      },
    }));

    // 通过 WebSocket 发送生成请求
    wsManager.send({
      type: 'generate',
      conversationID: conversationId,
      messageUserID: messageUserId,
      messageAssistantID: messageAssistantId,
      prompt: requestData.prompt,
      model: requestData.model,
      base64: requestData.base64,
      reasoning: requestData.reasoning
    });

  } catch (error) {
    console.error('发送消息失败:', error);
    chatStore.setIsGenerating(false);
  }
};

// 处理停止生成（委托给 MessagesContainer 处理）
const handleStopGeneration = () => {
  // 停止逻辑在 MessagesContainer 中处理
  // 这里只需要通知 store 即可
  chatStore.setIsTyping(false);
};

// 切换推理模式
const toggleReasoning = () => {
  isReasoning.value = !isReasoning.value;
};

const focusMessageInput = () => {
  focusInput();
};

const clearAndFocusMessageInput = () => {
  focusAndClearInput();
};

defineExpose({
  focusMessageInput,
  clearAndFocusMessageInput,
});
</script>

<style scoped>
.input-area-container {
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-md);
}

.input-area-wrapper {
  position: relative;
  max-width: var(--input-area-max-width);
  margin-left: auto;
  margin-right: auto;
  border-radius: 1.5rem; /* 苹果风格大圆角 */
  border: 1px solid var(--input-wrapper-border-color);
  box-shadow: var(--input-wrapper-shadow);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  background-color: rgba(var(--input-bg-color), var(--input-bg-opacity)); /* 使用新的深色模式变量 */
  backdrop-filter: blur(10px); /* 添加模糊效果，增加活力 */
}

.input-area-wrapper:focus-within {
  border-color: var(--input-wrapper-focus-border-color);
  box-shadow: var(--input-wrapper-active-shadow);
}

#message-input {
  field-sizing: content;
  min-height: var(--input-min-height);
  width: 100%;
  border-radius: var(--input-field-border-radius);
  outline: none;
  font-size: var(--input-text-size);
  line-height: var(--input-line-height);
  background-color: transparent;
  border: none;
  resize: none;
  width: 100%;
  max-width: var(--input-area-max-width);
  min-width: var(--input-area-min-width);
  max-height: var(--input-max-height);
  padding-right: var(--input-padding-right);
  padding-left: var(--spacing-md);
  margin-top: var(--input-margin-top);
  margin-bottom: var(--spacing-sm);
  color: inherit; /* 使用继承的颜色 */
}

.message-input::placeholder {
  color: var(--input-placeholder-color);
}

.message-input:focus {
  outline: none;
  box-shadow: 0 0 #0000;
}

.input-button-group-left {
  position: relative;
  left: var(--spacing-sm);
  bottom: var(--spacing-sm);
  display: flex;
  flex-direction: row;
  gap: var(--spacing-sm);
  padding: 0.25rem 0.35rem;
  border-radius: 0.9rem;
}

.input-button-group-right {
  position: absolute;
  right: var(--spacing-sm);
  bottom: var(--spacing-sm);
  padding: 0.25rem;
  border-radius: 0.9rem;
}

.input-addon-button {
  height: var(--button-size);
  width: var(--button-size);
  background-color: #f5f5f5;
  border-radius: 0.75rem; /* 苹果风格小圆角 */
  color: #6b7280; /* 默认图标颜色 */
}

.input-upload-button {
  background-color: #f5f5f5;
  border-color: #e5e7eb;
  color: #6b7280;
}

.input-upload-button:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.dark .input-upload-button {
  background-color: #1f2937;
  border-color: #374151;
  color: #d1d5db;
}

.dark .input-upload-button:hover {
  background-color: #374151;
  border-color: #4b5563;
  color: #f3f4f6;
}

.input-addon-button:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
  color: #374151;
}

.dark .input-addon-button {
  background-color: #1f2937;
  border-color: #374151;
  color: #d1d5db;
}

.dark .input-addon-button:hover {
  background-color: #374151;
  border-color: #4b5563;
  color: #f3f4f6;
}

/* 推理按钮样式 */
.reasoning-button {
  height: var(--button-size);
  width: auto;
  padding: 0 0.75rem;
  background-color: #f5f5f5;
  border-radius: 0.75rem; /* 苹果风格小圆角 */
  color: #6b7280; /* 默认图标颜色 */
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.reasoning-button:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
  color: #374151;
}

/* 推理按钮选中状态 - 使用主题色 */
.reasoning-button-active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: #ffffff;
}

.dark .reasoning-button-active {
  background-color: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
  color: #ffffff;
}

.dark .reasoning-button-active:hover {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: #ffffff;
}

.reasoning-text {
  font-size: var(--font-size-sm);
}

.message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-send-button {
  height: var(--button-size);
  width: var(--button-size);
  background-color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 0.75rem; /* 苹果风格小圆角 */
  color: #ffffff; /* 默认图标颜色 */
}

.input-send-button:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  color: #ffffff;
}

.input-send-button:disabled {
  background-color: #e5e7eb;
  border-color: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.dark .input-send-button {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: #ffffff;
}

.dark .input-send-button:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  color: #ffffff;
}

.dark .input-send-button:disabled {
  background-color: #374151;
  border-color: #374151;
  color: #6b7280;
}



/* 由于我们无法直接通过CSS检测按钮是否在isGenerating状态下，需要使用一个新类名 */
.input-send-button-stop {
  background-color: transparent !important;
  border: 1px solid var(--color-red-500) !important; /* 红色边框 */
  color: var(--color-red-500) !important; /* 红色图标 */
}

.input-send-button-stop:hover {
  background-color: #fef2f2 !important; /* 浅红色背景 */
  border-color: var(--color-red-600) !important;
  color: var(--color-red-600) !important;
}

.dark .input-send-button-stop {
  background-color: transparent !important;
  border-color: #f87171 !important;
  color: #f87171 !important;
}

.dark .input-send-button-stop:hover {
  background-color: #451a1a !important;
  border-color: #fca5a5 !important;
  color: #fca5a5 !important;
}

.icon-small {
  height: var(--button-icon-size);
  width: var(--button-icon-size);
}
</style>

<style>
/* 响应式文本区域字体大小 */
.responsive-textarea {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

/* 小屏幕设备 (手机) */
@media (max-width: 640px) {
  .responsive-textarea {
    font-size: 0.8125rem;
    /* 13px */
    line-height: 1.25rem;
  }

  .reasoning-text {
    font-size: 0.75rem;
    /* 12px */
  }

  .icon-small {
    height: 1rem;
    width: 1rem;
  }
}

/* 中等屏幕设备 (平板) */
@media (min-width: 641px) and (max-width: 1024px) {
  .responsive-textarea {
    font-size: 0.875rem;
    /* 14px */
    line-height: 1.25rem;
  }

  .reasoning-text {
    font-size: 0.8125rem;
    /* 13px */
  }
}

/* 大屏幕设备 (桌面) */
@media (min-width: 1025px) {
  .responsive-textarea {
    font-size: 1rem;
    /* 16px */
    line-height: 1.5rem;
  }

  .reasoning-text {
    font-size: 0.875rem;
    /* 14px */
  }
}

/* 高分辨率屏幕或远距离观看 (如外接显示器) */
@media (min-width: 1440px) {
  .responsive-textarea {
    font-size: 1.125rem;
    /* 18px */
    line-height: 1.75rem;
  }

  .reasoning-text {
    font-size: 1rem;
    /* 16px */
  }
}

.image-preview-container {
  padding: 10px 0 0 10px;
  /* 顶部padding设为0 */
  clear: both;
  margin-bottom: 10px;
  /* 与下面的textarea保持一定间距 */
}

.image-wrapper {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-gray-300);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-gray-100);
  /* 添加背景色 */
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--color-red-500);
  border: 2px solid white;
  /* 添加白色边框，确保按钮可见 */
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  z-index: 10;
}

.remove-icon {
  color: white;
  width: 14px;
  height: 14px;
}
</style>