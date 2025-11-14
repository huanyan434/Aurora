<template>
  <div ref="containerRef" class="w-full h-full overflow-y-auto p-4">
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- 加载动画 -->
      <div v-if="isLoading" class="flex justify-center items-center py-10">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
      
      <!-- 消息列表 -->
      <div v-else v-for="(message, index) in messages" :key="index" class="flex">
        <div 
          :class="[
            'max-w-[85%] rounded-lg px-4 py-3',
            message.sender === 'user' 
              ? 'bg-gray-100 dark:bg-gray-800 ml-auto' 
              : 'bg-white dark:bg-gray-900 mr-auto'
          ]"
        >
          <div 
            v-if="message.sender === 'ai'" 
            class="text-gray-800 dark:text-gray-200" 
            v-html="renderMarkdown(message.content)"
          ></div>
          <div v-else class="text-gray-800 dark:text-gray-200">{{ message.content }}</div>
        </div>
      </div>
      
      <!-- 占位消息，提示目前逻辑为空 -->
      <div v-if="!isLoading && messages.length === 0" class="text-center text-gray-500 dark:text-gray-400 py-10">
        尚无消息，开始对话吧！
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { getMessagesList } from '@/api/chat';
import { useRoute } from 'vue-router';
import { marked } from 'marked';

// 定义消息类型
interface Message {
  id?: string;
  sender: typeof MESSAGE_SENDER[keyof typeof MESSAGE_SENDER];
  content: string;
  timestamp?: Date;
}

// 路由和路由参数
const route = useRoute();

// 状态变量
const messages = ref<Message[]>([]);
const isLoading = ref(false);

// 获取容器元素的引用
const containerRef = ref<HTMLElement | null>(null);

/**
 * 滚动到容器底部的函数
 */
const scrollToBottom = () => {
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight;
  }
};

/**
 * 处理消息内容，过滤掉模型标识等非必要内容
 * @param content 消息内容
 * @param reasoningContent 推理内容（可选）
 * @returns 处理后的消息内容
 */
const processMessageContent = (content: string, reasoningContent?: string) => {
  if (!content) return '';
  
  // 移除模型标识符，如 <model=deepseek-v3.2-exp>
  let processedContent = content.replace(/<model=[^>]+>/g, '').trim();
  
  // 如果有推理内容，也可以选择性地添加到主内容中
  if (reasoningContent) {
    // 可以选择是否显示推理内容
    // 以下是一个示例，将推理内容作为注释添加
    // processedContent += `\n\n[推理过程: ${reasoningContent}]`;
  }
  
  return processedContent;
};

/**
 * 渲染 markdown 内容（仅用于 AI 消息）
 * @param content 原始内容
 * @returns 渲染后的 HTML
 */
const renderMarkdown = (content: string) => {
  if (!content) return '';
  
  // 使用 marked 库解析 markdown
  const renderer = new marked.Renderer();
  
  // 自定义链接渲染以确保安全性
  renderer.link = ({ href, title, text }) => {
    // 确保链接是安全的协议
    const sanitizedHref = href && (href.startsWith('http://') || href.startsWith('https://')) 
      ? href 
      : `https://${href || ''}`;
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${sanitizedHref}"${titleAttr} target="_blank" rel="noopener noreferrer">${text || ''}</a>`;
  };
  
  // 自定义图片渲染以确保安全性
  renderer.image = ({ href, title, text }) => {
    // 只允许安全的图片链接
    const sanitizedHref = href && (href.startsWith('http://') || href.startsWith('https://')) 
      ? href 
      : '';
    const sanitizedText = text || '';
    const titleAttr = title ? ` title="${title}"` : '';
    return sanitizedHref 
      ? `<img src="${sanitizedHref}" alt="${sanitizedText}"${titleAttr} class="max-w-full h-auto">` 
      : '';
  };
  
  // 自定义代码块渲染
  renderer.code = ({ text, lang, escaped }) => {
    // 如果内容已经被转义，则直接使用；否则可能需要转义特殊字符
    const codeContent = escaped ? text : text; // 在实际应用中可能需要使用转义函数
    return `<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded my-2 overflow-x-auto"><code class="language-${lang || 'text'}">${codeContent}</code></pre>`;
  };
  
  // 自定义行内代码渲染
  renderer.codespan = ({ text }) => {
    return `<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono text-sm">${text}</code>`;
  };
  
  // 自定义列表项渲染
  renderer.listitem = (item) => {
    const text = item.text || '';
    const task = item.task || false;
    const checked = item.checked || false;
    
    if (task) {
      // 如果是任务列表项，添加复选框
      const checkedAttr = checked ? ' checked' : '';
      return `<li class="ml-4"><input type="checkbox" disabled${checkedAttr}> ${text}</li>`;
    }
    return `<li class="ml-4">${text}</li>`;
  };
  
  // 自定义表格单元格渲染
  renderer.tablecell = (token) => {
    // 安全地访问内容，避免未定义错误
    let content = '';
    if (token.tokens && Array.isArray(token.tokens) && token.tokens.length > 0) {
      const firstToken = token.tokens[0];
      if (firstToken && typeof firstToken === 'object') {
        content = 'text' in firstToken ? firstToken.text || '' : 
                  'content' in firstToken ? firstToken.content || '' : '';
      }
    } else {
      content = token.text || '';
    }
    
    const header = 'header' in token ? token.header : undefined;
    const align = 'align' in token ? token.align : undefined;
    const tag = header ? 'th' : 'td';
    const alignStyle = align ? ` text-align:${align};` : '';
    return `<${tag} style="border:1px solid #ccc; padding:4px;${alignStyle}">${content}</${tag}>`;
  };

  // 配置 marked 选项
  marked.setOptions({
    renderer: renderer,
    gfm: true,    // 启用 GitHub 风格的 Markdown
    breaks: true  // 启用换行符转换为 <br> 标签
  });
  
  // 使用 marked 渲染内容
  return marked.parse(content);
};

/**
 * 挂载后检测 URL 参数
 */
onMounted(async () => {
  // 检测当前路径是否为 /c/xxx
  const cPattern = /^\/c\/.+$/;
  if (cPattern.test(route.path)) {
    // 检查是否存在 type 参数且为数字
    const typeParam = route.query.type;
    let typeValue: number | undefined;
    
    if (typeParam !== undefined) {
      const parsedType = Number(typeParam);
      if (!isNaN(parsedType)) {
        typeValue = parsedType;
      }
    }
    
    // 修改 URL 去掉 type 参数 (使用 history API 避免页面刷新)
    if (typeParam !== undefined) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('type');
      window.history.replaceState({}, '', newUrl.toString());
    }
    
    // 获取对话 ID (从路径的第二部分)
    const pathParts = route.path.split('/');
    const conversationIdString = pathParts.length > 2 ? pathParts[2] : undefined;
    const conversationId = conversationIdString ? parseInt(conversationIdString) : NaN;
    
    if (!isNaN(conversationId)) {
      // 设置加载状态
      isLoading.value = true;
      
      try {
        // 获取对话历史
        const response = await getMessagesList({ conversationID: conversationId });
        if (response.data.success) {
          // API 返回的消息格式为 JSON 字符串，需要解析
          let parsedMessages = [];
          
          if (typeof response.data.messages === 'string') {
            try {
              parsedMessages = JSON.parse(response.data.messages);
            } catch (error) {
              console.error('解析消息数据失败:', error);
              parsedMessages = [];
            }
          } else if (Array.isArray(response.data.messages)) {
            parsedMessages = response.data.messages;
          }
          
          // 转换消息格式以匹配前端要求
          messages.value = parsedMessages.map((msg: any) => ({
            id: msg.id?.toString(),
            sender: msg.role === 'assistant' ? 'ai' : 'user',
            // 处理可能包含模型标识和推理内容的消息内容
            content: processMessageContent(msg.content, msg.reasoningContent),
            timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date()
          }));
        }
      } catch (error) {
        console.error('获取对话历史失败:', error);
      } finally {
        isLoading.value = false;
        // 确保DOM更新后再滚动到底部
        await nextTick();
        scrollToBottom();
      }
      
      // 如果 type 不等于 2，则获取线程列表并根据条件执行生成请求
      if (typeValue !== 2) {
        try {
          const threadListResponse = await import('@/api/chat').then(mod => mod.getThreadList());
          if (threadListResponse.data.success && threadListResponse.data.thread_list) {
            const threadList = threadListResponse.data.thread_list;
            const threadKeys = Object.keys(threadList);
            
            // 检查当前对话ID是否存在线程列表中
            const conversationIdStr = conversationId.toString();
            if (threadKeys.includes(conversationIdStr)) {
              const threadData = threadList[conversationIdStr];
              const messageUserID = threadData.messageUserID;
              const messageAssistantID = threadData.messageAssistantID;
              
              // 向后端发起 generate 请求（此处先留空，由用户实现）
              // generate({
              //   conversationID: conversationId,
              //   messageUserID: messageUserID,
              //   messageAssistantID: messageAssistantID,
              //   // ... 其他必要参数
              // });
            }
          }
        } catch (error) {
          console.error('获取线程列表失败:', error);
        }
      }
    }
  }
});
</script>

<style scoped>
.messages-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: var(--spacing-md); /* p-4 */
}

.messages-content {
  max-width: var(--max-width-3xl); /* max-w-3xl */
  margin-left: auto;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg); /* space-y-6 */
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-2xl) 0; /* py-10 */
}

.loading-spinner {
  animation: var(--animation-spin);
  border-radius: 50%;
  height: var(--button-size); /* h-8 */
  width: var(--button-size); /* w-8 */
  border-bottom: 2px solid var(--color-gray-800); /* border-gray-900 */
}

.dark .loading-spinner {
  border-bottom: 2px solid var(--color-gray-50); /* dark:border-gray-100 */
}

.message-row {
  display: flex;
}

.message-content {
  max-width: 85%;
  border-radius: var(--border-radius-lg); /* rounded-lg */
  padding: 0.75rem var(--spacing-md); /* px-4 py-3 */
}

.message-user {
  background-color: var(--color-gray-100); /* bg-gray-100 */
  margin-left: auto; /* ml-auto */
}

.dark .message-user {
  background-color: var(--color-gray-700); /* dark:bg-gray-800 */
}

.message-ai {
  background-color: var(--color-white); /* bg-white */
  margin-right: auto; /* mr-auto */
}

.dark .message-ai {
  background-color: var(--color-gray-900); /* dark:bg-gray-900 */
}

.message-text {
  color: var(--color-gray-800); /* text-gray-800 */
}

.dark .message-text {
  color: var(--color-gray-200); /* dark:text-gray-200 */
}

.no-messages {
  text-align: center;
  color: var(--color-gray-500); /* text-gray-500 */
  padding: var(--spacing-2xl) 0; /* py-10 */
}

.dark .no-messages {
  color: var(--color-gray-400); /* dark:text-gray-400 */
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>