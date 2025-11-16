<template>
  <div ref="containerRef" class="w-full h-full overflow-y-auto p-4">
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- 加载动画 -->
      <div v-if="isLoading" class="flex justify-center items-center py-10">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
      
      <!-- 消息列表 -->
      <div 
        v-else 
        v-for="(message, index) in displayedMessages" 
        :key="message.id || index" 
        class="flex flex-col"
        :class="message.role === 'user' ? 'items-end' : 'items-start'"
        @mouseenter="hoveredMessageId = message.id || null"
        @mouseleave="hoveredMessageId = null"
      >
        <div 
          :class="[
            'max-w-[85%] rounded-lg px-4 py-3',
            message.role === 'user' 
              ? 'bg-gray-100 dark:bg-gray-800' 
              : 'bg-white dark:bg-gray-900'
          ]"
        >
          <!-- 用户消息 -->
          <div v-if="message.role === 'user'">
            <!-- 文本内容 -->
            <div v-if="message.content" class="text-gray-800 dark:text-gray-200">{{ message.content }}</div>
            
            <!-- 图片附件 -->
            <div v-if="message.base64" class="mt-2">
              <img :src="message.base64" alt="上传的图片" class="max-w-full h-auto rounded" />
            </div>
          </div>
          
          <!-- 助手消息 -->
          <div v-else>
            <!-- 推理内容 -->
            <ReasoningContent
              v-if="message.reasoningContent"
              :content="message.reasoningContent"
              :reasoning-time="message.reasoningTime || 0"
              :is-streaming="message.isStreaming || false"
            />
            
            <!-- 回复内容 -->
            <div 
              class="text-gray-800 dark:text-gray-200" 
              v-html="renderMarkdown(message.content)"
            ></div>
          </div>
        </div>
        
        <!-- 消息操作按钮 -->
        <div 
          :class="[
            'flex flex-row items-start mt-1',
            message.role === 'user' ? 'mr-2' : 'ml-2',
            (hoveredMessageId === (message.id || null) || index === displayedMessages.length - 1) ? 'opacity-100' : 'opacity-0'
          ]"
        >
          <button 
            @click="copyMessage(message.content)"
            class="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            title="复制"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 3V7C14 7.26522 14.1054 7.51957 14.2929 7.70711L16.2929 9.70711C16.4804 9.89464 16.7348 10 17 10H21M14 3H10C9.44772 3 9 3.44772 9 4V7H6C5.44772 7 5 7.44772 5 8V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V15H16C15.4477 15 15 14.5523 15 14V11H12C11.4477 11 11 10.5523 11 10V7H8C7.44772 7 7 6.55228 7 6V4C7 3.44772 7.44772 3 8 3H14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          
          <div class="relative">
            <button 
              @click="toggleMenu(message.id)"
              class="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ml-1"
              title="更多"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="18" cy="12" r="1.5" fill="currentColor"/>
              </svg>
            </button>
            
            <!-- 下拉菜单 -->
            <div 
              v-if="openedMenuId === message.id"
              class="absolute top-full mt-2 right-0 w-24 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700"
            >
              <!-- 分享功能暂时不做 -->
              <button 
                class="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="openDeleteDialog(message.id)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="mr-2">
                  <path d="M3 6H5M5 6H21M5 6V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V6H5ZM10 11V17M14 11V17M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6H8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 删除确认对话框 -->
      <Dialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这条消息吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button 
              @click="isDeleteDialogOpen = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
            >
              取消
            </button>
            <button 
              @click="confirmDeleteMessage"
              class="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none"
            >
              删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <!-- 占位消息，提示目前逻辑为空 -->
      <div v-if="!isLoading && displayedMessages.length === 0" class="text-center text-gray-500 dark:text-gray-400 py-10">
        尚无消息，开始对话吧！
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { getMessagesList, deleteMessage as deleteMessageAPI } from '@/api/chat';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import { useChatStore } from '@/stores/chat';
import ReasoningContent from './ReasoningContent.vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { addToast } from '@/components/ui/toast/use-toast'

// 定义消息类型
interface DisplayMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  base64?: string;
  reasoningContent?: string;
  reasoningTime?: number;
  isStreaming?: boolean;
}

// 路由和路由参数
const route = useRoute();
const chatStore = useChatStore();

// 状态变量
const isLoading = ref(false);
const hoveredMessageId = ref<number | null>(null);
const openedMenuId = ref<number | null>(null);
const isDeleteDialogOpen = ref(false);
const messageToDelete = ref<number | null>(null);

// 获取容器元素的引用
const containerRef = ref<HTMLElement | null>(null);

// 计算属性：获取当前对话的消息
const conversationMessages = computed(() => {
  // 从路由参数获取对话ID
  const routeParams = route.params.conversationId;
  let conversationId: number | null = null;
  
  if (typeof routeParams === 'string') {
    conversationId = parseInt(routeParams);
  } else if (Array.isArray(routeParams) && routeParams.length > 0) {
    // 修复类型检查问题
    const param = routeParams[0];
    if (param !== undefined) {
      conversationId = parseInt(param);
    }
  }
  
  // 如果成功解析出有效的对话ID，则返回对应消息
  if (conversationId !== null && !isNaN(conversationId)) {
    return chatStore.getMessagesByConversationId(conversationId);
  }
  
  // 否则返回空数组
  return [];
});

// 计算属性：处理显示的消息
const displayedMessages = computed(() => {
  return conversationMessages.value.map((msg): DisplayMessage => {
    // 解析历史消息中的推理内容
    let reasoningContent = msg.reasoningContent;
    let reasoningTime = msg.reasoningTime || 0;
    
    // 如果没有独立的推理内容字段，尝试从内容中提取
    if (!reasoningContent && msg.content) {
      // 提取内容中的推理部分
      const thinkMatches = msg.content.matchAll(/<think time=(\d+)>([\s\S]*?)<\/think>/g);
      const contents = [];
      for (const match of thinkMatches) {
        contents.push(match[2]);
        // 获取最后一个推理时间
        reasoningTime = match[1] ? parseInt(match[1]) || 0 : 0;
      }
      
      if (contents.length > 0) {
        reasoningContent = contents.join('');
      }
    }
    
    return {
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      base64: msg.base64,
      reasoningContent: reasoningContent,
      reasoningTime: reasoningTime,
      isStreaming: msg.isStreaming
    };
  });
});

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
 * @returns 处理后的消息内容
 */
const processMessageContent = (content: string) => {
  if (!content) return '';
  
  // 移除模型标识符，如 <model=deepseek-v3.2-exp>
  let processedContent = content.replace(/<model=[^>]+>/g, '').trim();
  
  // 移除推理内容标签
  processedContent = processedContent.replace(/<think time=(\d+)>([\s\S]*?)<\/think>/g, '').trim();
  
  return processedContent;
};

/**
 * 渲染 markdown 内容（仅用于 AI 消息）
 * @param content 原始内容
 * @returns 渲染后的 HTML
 */
const renderMarkdown = (content: string) => {
  if (!content) return '';
  
  // 移除模型标识符和推理内容
  let processedContent = content.replace(/<model=[^>]+>/g, '').trim();
  processedContent = processedContent.replace(/<think time=(\d+)>([\s\S]*?)<\/think>/g, '').trim();
  
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
  return marked.parse(processedContent);
};

// 复制消息内容到剪贴板
const copyMessage = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content);
    addToast({
      title: '复制成功',
      description: '消息已复制到剪贴板',
      variant: 'default',
      duration: 3000
    });
  } catch (err) {
    addToast({
      title: '复制失败',
      description: '无法复制消息到剪贴板',
      variant: 'destructive',
      duration: 3000
    });
    console.error('复制失败:', err);
  }
};

// 切换菜单显示状态
const toggleMenu = (messageId: number | undefined) => {
  if (messageId === undefined) return;
  
  if (openedMenuId.value === messageId) {
    openedMenuId.value = null;
  } else {
    openedMenuId.value = messageId;
  }
};

// 打开删除确认对话框
const openDeleteDialog = (messageId: number | undefined) => {
  if (messageId === undefined) return;
  
  messageToDelete.value = messageId;
  isDeleteDialogOpen.value = true;
};

// 确认删除消息
const confirmDeleteMessage = async () => {
  if (messageToDelete.value === null) return;
  
  try {
    // 关闭对话框
    isDeleteDialogOpen.value = false;
    
    // 调用API删除消息
    await deleteMessageAPIFunc(messageToDelete.value);
    
    // 从store中移除消息
    chatStore.removeMessage(messageToDelete.value);
    
    // 重置待删除消息ID
    messageToDelete.value = null;
  } catch (error) {
    console.error('删除消息失败:', error);
    // 重置待删除消息ID
    messageToDelete.value = null;
  }
};

// 调用API删除消息
const deleteMessageAPIFunc = async (messageId: number) => {
  try {
    const response = await deleteMessageAPI({ messageID: messageId });
    if (!response.data.success) {
      throw new Error(response.data.error || '删除消息失败');
    }
  } catch (error) {
    console.error('删除消息API调用失败:', error);
    throw error;
  }
};

// 点击其他地方关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (openedMenuId.value !== null) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      openedMenuId.value = null;
    }
  }
};

// 监听消息变化，自动滚动到底部
watch(displayedMessages, () => {
  nextTick(() => {
    scrollToBottom();
  });
}, { deep: true });

/**
 * 挂载后检测 URL 参数
 */
onMounted(async () => {
  // 添加点击事件监听器，用于关闭菜单
  document.addEventListener('click', handleClickOutside);
  
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
    
    // 类型断言确保 conversationId 是有效的数字
    if (!isNaN(conversationId)) {
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
          
          // 转换消息格式以匹配前端要求并保存到 store
          const formattedMessages = parsedMessages.map((msg: any) => {
            // 提取推理内容
            let reasoningContent = msg.reasoning_content || '';
            let reasoningTime = 0;
            
            // 如果没有独立的推理内容字段，尝试从内容中提取
            if (!reasoningContent && msg.content) {
              // 提取内容中的推理部分
              const thinkMatches = msg.content.matchAll(/<think time=(\d+)>([\s\S]*?)<\/think>/g);
              const contents = [];
              for (const match of thinkMatches) {
                contents.push(match[2]);
                // 获取最后一个推理时间
                reasoningTime = match[1] ? parseInt(match[1]) || 0 : 0;
              }
              
              if (contents.length > 0) {
                reasoningContent = contents.join('');
              }
            }
            
            return {
              id: msg.id,
              role: msg.role,
              content: processMessageContent(msg.content),
              conversationID: msg.conversationID,
              createdAt: msg.createdAt,
              base64: msg.base64,
              reasoningContent: reasoningContent,
              reasoningTime: reasoningTime
            };
          });
          
          // 保存消息到 store
          chatStore.setMessages(conversationId, formattedMessages);
        }
      } catch (error) {
        console.error('获取对话历史失败:', error);
      } finally {
        isLoading.value = false;
        // 确保DOM更新后再滚动到底部
        await nextTick();
        scrollToBottom();
      }
    }
  }
});

// 组件卸载时移除事件监听器
onMounted(() => {
  return () => {
    document.removeEventListener('click', handleClickOutside);
  };
});
</script>