<template>
  <div class="input-area-container">
    <div class="input-area-wrapper">
      <div class="input-container-wrapper">
        <div class="input-container">
          <textarea 
            v-model="inputMessage" 
            @keydown="handleKeydown" 
            placeholder="询问任何问题"
            rows="3" 
            ref="inputRef"
            class="message-input"
          ></textarea>

          <!-- 左下角按钮组 -->
          <div class="input-button-group-left">
            <!-- 文件上传按钮 -->
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button variant="ghost" size="icon" class="input-addon-button" @click="triggerFileUpload">
                    <Plus class="icon-small" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>上传文件</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <!-- 隐藏的文件输入框 -->
            <input 
              type="file" 
              ref="fileInputRef" 
              @change="handleFileSelect" 
              accept="image/*" 
              style="display: none" 
            />

            <!-- 推理按钮 -->
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button variant="ghost" size="icon"
                    :class="['input-addon-button', 'reasoning-button', { 'reasoning-active': isReasoning }]"
                    :disabled="isReasoningDisabled" @click="toggleReasoning">
                    <Lightbulb class="icon-small" />
                    <span class="reasoning-text">推理</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>让模型思考地更深入</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <!-- 右下角发送/停止按钮 -->
          <div class="input-button-group-right">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button v-if="isGenerating" @click="handleStopGeneration" variant="ghost" size="icon"
                    class="input-send-button">
                    <Square class="icon-small" />
                  </Button>
                  <Button v-else @click="handleSendMessage" variant="ghost" size="icon"
                    :disabled="!canSendMessage" class="input-send-button">
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
import { ref, computed, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Plus, Lightbulb, Square, Send } from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';
import { generateSnowflakeId } from '@/utils/snowflake';
import { newConversation, stopGenerate } from '@/api/chat';
import type { Model } from '@/stores/chat';

// 响应式数据
const inputMessage = ref('');
const isGenerating = ref(false);
const isReasoning = ref(false);
const inputRef = ref<HTMLElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const attachment = ref<string>(''); // 存储base64编码的图片
const chatStore = useChatStore();
const route = useRoute();
const router = useRouter();

// EventSource引用
const eventSource: Ref<EventSource | null> = ref(null);

// 存储当前正在生成的消息ID和对话ID
const currentAssistantMessageId = ref<number | null>(null);
const currentConversationId = ref<number | null>(null);

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

// 处理流数据块
const processStreamChunk = (
  chunk: string, 
  onUpdate: (content: string, reasoningContent: string) => void
) => {
  // 解析SSE数据块
  const lines = chunk.split('\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      try {
        const data = JSON.parse(line.slice(5));
        if (data.success) {
          onUpdate(data.content || '', data.reasoningContent || '');
        } else {
          console.error('服务器返回错误:', data.error);
        }
      } catch (e) {
        console.error('解析数据失败:', e);
      }
    }
  }
};

// 处理发送消息
const handleSendMessage = async () => {
  if (!canSendMessage.value) return;

  isGenerating.value = true;
  eventSource.value = null;

  try {
    // 获取当前对话ID
    let conversationId: number | null = null;
    
    // 检查是否是根路由
    const isHomeRoute = route.path === '/';
    
    if (isHomeRoute) {
      // 创建新对话
      const response = await newConversation();
      if (response.data.success) {
        conversationId = parseInt(response.data.conversationID);
        currentConversationId.value = conversationId;
        // 跳转到新对话页面
        await router.push(`/c/${conversationId}?type=2`);
        // 刷新对话列表
        await chatStore.fetchConversations();
      } else {
        throw new Error('创建新对话失败');
      }
    } else {
      // 从路由参数获取对话ID
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
      currentConversationId.value = conversationId;
    }

    if (!conversationId) {
      throw new Error('无法确定对话ID');
    }

    // 生成snowflake ID
    const messageUserId = Number(generateSnowflakeId());
    const messageAssistantId = Number(generateSnowflakeId());
    currentAssistantMessageId.value = messageAssistantId;

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
      isStreaming: true // 立即设置为流式传输状态
    });

    // 使用 fetch + ReadableStream 处理 SSE 流（遵循规范）
    const response = await fetch('/chat/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.body) {
      // 如果响应没有body，设置isStreaming为false
      chatStore.updateMessage(messageAssistantId, {
        isStreaming: false
      });
      throw new Error('响应中没有body');
    }

    // 处理 SSE 流
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedContent = '';
    let accumulatedReasoningContent = '';
    let lastReasoningTime = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        // 处理每个数据块
        processStreamChunk(chunk, (content, reasoningContent) => {
          accumulatedContent += content;
          accumulatedReasoningContent += reasoningContent;
          
          // 解析推理时间
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const data = JSON.parse(line.slice(5));
                if (data.success && data.reasoningTime !== undefined) {
                  lastReasoningTime = data.reasoningTime;
                }
              } catch (e) {
                // 解析失败，忽略错误
              }
            }
          }
          
          // 更新助手消息，标记为流式传输
          chatStore.updateMessage(messageAssistantId, {
            content: accumulatedContent,
            reasoningContent: accumulatedReasoningContent,
            reasoningTime: lastReasoningTime,
            isStreaming: true
          });
        });
      }
    } catch (error) {
      console.error('读取流时出错:', error);
    } finally {
      reader.releaseLock();
      // 流结束后更新消息状态
      chatStore.updateMessage(messageAssistantId, {
        isStreaming: false
      });
    }
    
  } catch (error) {
    console.error('发送消息失败:', error);
  } finally {
    isGenerating.value = false;
    currentAssistantMessageId.value = null;
  }
};


// 处理停止生成
const handleStopGeneration = async () => {
  console.log('停止生成');
  
  try {
    // 调用后端API停止生成
    if (currentConversationId.value) {
      await stopGenerate({
        conversationID: currentConversationId.value
      });
    }
    
    // 保留已生成的内容，只停止生成过程
    console.log('已停止生成，保留已生成内容');
  } catch (error) {
    console.error('停止生成失败:', error);
  } finally {
    isGenerating.value = false;
    currentAssistantMessageId.value = null;
  }
};

// 切换推理模式
const toggleReasoning = () => {
  if (isReasoningDisabled.value) return;
  isReasoning.value = !isReasoning.value;
};

</script>

<style scoped>
.input-area-container {
  padding: var(--input-area-horizontal-padding) var(--input-area-horizontal-padding) var(--input-area-bottom-padding);
}

/* 推理按钮激活状态样式 */
:root {
  --reasoning-button-bg: #3b82f6;
  /* bg-blue-500 */
  --reasoning-button-text: #ffffff;
  /* text-white */
  --reasoning-button-hover-bg: #2563eb;
  /* hover:bg-blue-600 */
}

.dark {
  --reasoning-button-bg: #1d4ed8;
  /* dark:bg-blue-700 */
  --reasoning-button-text: #ffffff;
  /* dark:text-white */
  --reasoning-button-hover-bg: #1e40af;
  /* dark:hover:bg-blue-800 */
}

.input-area-wrapper {
  max-width: var(--input-area-max-width);
  margin-left: auto;
  margin-right: auto;
}

.input-container-wrapper {
  border: 1px solid var(--color-gray-200);
  /* border border-gray-200 */
  border-radius: var(--input-container-border-radius);
  background-color: var(--color-white);
  /* bg-white */
}

.dark .input-container-wrapper {
  border-color: var(--color-gray-700);
  /* dark:border-gray-700 */
  background-color: var(--color-black);
  /* dark:bg-black */
}

.input-container {
  position: relative;
}

.message-input {
  field-sizing: content;
  min-height: var(--input-min-height);
  width: 100%;
  border-radius: var(--input-field-border-radius);
  padding: var(--input-field-padding-y) var(--input-field-padding-x);
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
  /* 与右边按钮位置对齐 */
  padding-left: var(--input-padding-left);
  /* 与左边按钮位置对齐 */
  margin-bottom: var(--input-margin-bottom);
  /* 为底部按钮留出空间 */
  color: var(--color-gray-800);
  /* text-gray-800 */
}

.message-input::placeholder {
  color: var(--input-placeholder-color);
}

.dark .message-input::placeholder {
  color: var(--input-placeholder-color-dark);
}

.dark .message-input {
  color: var(--color-gray-200);
  /* dark:text-gray-200 */
  background-color: rgba(var(--input-bg-color-dark), var(--input-bg-opacity-dark));
}

.message-input:focus {
  outline: none;
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(0px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.input-button-group-left {
  position: relative;
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
  border-radius: var(--border-radius-full);
  /* rounded-full */
}

.input-addon-button:hover {
  background-color: var(--color-gray-200);
  /* hover:bg-gray-200 */
}

.dark .input-addon-button:hover {
  background-color: var(--color-gray-700);
  /* dark:hover:bg-gray-700 */
}

.reasoning-button {
  background-color: var(--reasoning-button-bg);
  color: var(--reasoning-button-text);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  /* 添加图标和文字之间的间距 */
  width: calc(var(--button-size) * 2);
  /* 设置为默认按钮尺寸的2倍宽度 */
}

.reasoning-button:hover {
  background-color: var(--reasoning-button-hover-bg);
}

.reasoning-text {
  font-size: var(--font-size-sm);
  /* 设置文字大小为稍大一点 */
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
  border-radius: var(--border-radius-full);
  /* rounded-full */
}

.input-send-button:hover {
  background-color: var(--color-gray-200);
  /* hover:bg-gray-200 */
}

.dark .input-send-button:hover {
  background-color: var(--color-gray-700);
  /* dark:hover:bg-gray-700 */
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
    font-size: 0.8125rem; /* 13px */
    line-height: 1.25rem;
  }
  
  .reasoning-text {
    font-size: 0.75rem; /* 12px */
  }
  
  .icon-small {
    height: 1rem;
    width: 1rem;
  }
}

/* 中等屏幕设备 (平板) */
@media (min-width: 641px) and (max-width: 1024px) {
  .responsive-textarea {
    font-size: 0.875rem; /* 14px */
    line-height: 1.25rem;
  }
  
  .reasoning-text {
    font-size: 0.8125rem; /* 13px */
  }
}

/* 大屏幕设备 (桌面) */
@media (min-width: 1025px) {
  .responsive-textarea {
    font-size: 1rem; /* 16px */
    line-height: 1.5rem;
  }
  
  .reasoning-text {
    font-size: 0.875rem; /* 14px */
  }
}

/* 高分辨率屏幕或远距离观看 (如外接显示器) */
@media (min-width: 1440px) {
  .responsive-textarea {
    font-size: 1.125rem; /* 18px */
    line-height: 1.75rem;
  }
  
  .reasoning-text {
    font-size: 1rem; /* 16px */
  }
}
</style>