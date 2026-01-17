<template>
  <div class="conversations-container">
    <!-- 历史对话标题 -->
    <div class="history-title">
      历史对话
    </div>
    <div v-for="conversation in chatStore.sortedConversations" :key="conversation.id" :class="[
      'conversation-item',
      selectedConversationId === conversation.id ? 'conversation-selected' : 'conversation-unselected'
    ]" @click="selectConversation(conversation.id)">
      <div class="conversation-title">
        {{ conversation.title }}
      </div>

      <!-- 更多操作按钮 -->
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon"
                  class="more-options-btn"
                  @click.stop>
                  <svg xmlns="http://www.w3.org/2000/svg" class="more-options-icon" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent class="more-options-dropdown">
                <DropdownMenuItem @click.stop="renameConversationHandler(conversation)">
                  <span>重命名</span>
                </DropdownMenuItem>
                <DropdownMenuItem @click.stop="deleteConversationHandler(conversation)" class="delete-menu-item">
                  <span class="delete-text">删除</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent>
            <p>更多操作</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <div v-if="loading" class="loading-message">
      加载中...
    </div>
    <div v-else-if="error" class="error-message">
      加载失败: {{ error }}
    </div>
  </div>

  <!-- 重命名对话弹窗 -->
  <Dialog v-model:open="showRenameDialog">
    <DialogContent class="rename-dialog-content">
      <DialogHeader>
        <DialogTitle>重命名对话</DialogTitle>
      </DialogHeader>
      <div class="rename-dialog-body">
        <div class="rename-input-container">
          <Input id="name" v-model="renameInput" class="rename-input" @keyup.enter="confirmRenameConversation" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="cancelRenameConversation">取消</Button>
        <Button @click="confirmRenameConversation">确认</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 删除对话确认弹窗 -->
  <Dialog v-model:open="showDeleteDialog">
    <DialogContent class="delete-dialog-content">
      <DialogHeader>
        <DialogTitle>确认删除对话</DialogTitle>
      </DialogHeader>
      <div class="delete-dialog-body">
        <p>确定要删除对话 "{{ currentConversation?.title }}" 吗？此操作无法撤销。</p>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="cancelDeleteConversation">取消</Button>
        <Button @click="confirmDeleteConversation" class="delete-dialog-btn">删除</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { renameConversation, deleteConversation } from '@/api/chat';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toastSuccess, toastError } from '@/components/ui/toast/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

// 获取聊天store
const chatStore = useChatStore();
const selectedConversationId = ref<number | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const showRenameDialog = ref(false);
const showDeleteDialog = ref(false);
const renameInput = ref('');
const currentConversation = ref<any>(null);

// 获取路由和路由器
const route = useRoute();
const router = useRouter();

// 监听路由变化
watch(
  () => route.path,
  (newPath) => {
    // 如果路径是根路径（/），则不选中任何对话
    if (newPath === '/') {
      selectedConversationId.value = null;
    } else if (newPath.startsWith('/c/')) {
      // 如果路径是 /c/conversationId，则选中对应的对话
      const conversationId = parseInt(newPath.substring(3)); // 去掉 '/c/' 前缀并转为数字
      if (!isNaN(conversationId)) {
        selectedConversationId.value = conversationId;
      }
    }
  },
  { immediate: true }
);

// 获取对话列表
const fetchConversations = async () => {
  loading.value = true;
  error.value = null;

  try {
    await chatStore.fetchConversations();
    // 检查当前路由是否指向一个有效的对话
    if (route.path.startsWith('/c/')) {
      const conversationId = parseInt(route.path.substring(3));
      if (!isNaN(conversationId) &&
        !chatStore.conversations.some(conv => conv.id === conversationId)) {
        // 如果当前URL中的对话ID不存在，取消选中状态
        selectedConversationId.value = null;
      }
    }
  } catch (err) {
    console.error('获取对话列表失败:', err);
    error.value = '网络错误，请稍后重试';
  } finally {
    loading.value = false;
  }
};

// 选择对话的函数
const selectConversation = (id: number) => {
  selectedConversationId.value = id;
  // 跳转到对应的对话页面
  router.push(`/c/${id}`);
};

// 重命名对话的函数
const renameConversationHandler = async (conversation: any) => {
  // 设置当前对话和输入框的初始值
  currentConversation.value = conversation;
  renameInput.value = conversation.title;
  showRenameDialog.value = true;
};

// 确认重命名对话
const confirmRenameConversation = async () => {
  if (!currentConversation.value || !renameInput.value) {
    return;
  }

  const newName = renameInput.value.trim();
  if (newName && newName !== currentConversation.value.title) {
    try {
      // 调用API更新对话名称
      await renameConversation({
        conversationID: currentConversation.value.id,
        title: newName
      });

      toastSuccess('对话重命名成功');
      showRenameDialog.value = false;
      // 刷新对话列表
      await fetchConversations();
    } catch (error) {
      console.error('重命名对话失败:', error);
      toastError('重命名对话失败');
    }
  } else {
    showRenameDialog.value = false;
  }
};

// 取消重命名对话
const cancelRenameConversation = () => {
  showRenameDialog.value = false;
  currentConversation.value = null;
  renameInput.value = '';
};

// 确认删除对话
const confirmDeleteConversation = async () => {
  if (!currentConversation.value) {
    return;
  }

  try {
    // 调用API删除对话
    await deleteConversation({
      conversationID: currentConversation.value.id
    });

    toastSuccess('对话删除成功');

    // 如果当前选中的是被删除的对话，跳转到首页
    if (selectedConversationId.value === currentConversation.value.id) {
      router.push('/');
    }

    // 刷新对话列表
    await fetchConversations();

    // 关闭删除对话框
    showDeleteDialog.value = false;
  } catch (error) {
    console.error('删除对话失败:', error);
    toastError('删除对话失败');
    showDeleteDialog.value = false;
  }
};

// 取消删除对话
const cancelDeleteConversation = () => {
  showDeleteDialog.value = false;
  currentConversation.value = null;
};

// 删除对话的函数
const deleteConversationHandler = async (conversation: any) => {
  currentConversation.value = conversation;
  showDeleteDialog.value = true;
};

// 初始化获取对话列表
onMounted(() => {
  fetchConversations();
});

// 重新加载对话列表的方法（可由父组件调用）
const reloadConversations = () => {
  fetchConversations();
};

// 暴露reloadConversations方法，供父组件调用
defineExpose({
  reloadConversations
});
</script>

<style scoped>
.conversations-container {
  flex: 1;
  overflow-y: auto;
  padding-left: var(--spacing-sm); /* px-2 */
  padding-right: var(--spacing-sm); /* px-2 */
}

.history-title {
  padding-left: var(--spacing-sm); /* px-3 */
  padding-right: var(--spacing-sm); /* px-3 */
  padding-top: var(--spacing-sm); /* py-2 */
  padding-bottom: var(--spacing-sm); /* py-2 */
  font-size: var(--font-size-xs); /* text-xs */
  color: var(--color-gray-500); /* text-gray-500 */
  font-weight: 500; /* font-medium */
}

.dark .history-title {
  color: var(--color-gray-400); /* dark:text-gray-400 */
}

.conversation-item {
  width: 100%;
  padding-left: var(--spacing-sm); /* px-3 */
  padding-right: var(--spacing-sm); /* px-3 */
  padding-top: var(--spacing-sm); /* py-2 */
  padding-bottom: var(--spacing-sm); /* py-2 */
  margin-bottom: var(--spacing-xs); /* mb-1 */
  border-radius: var(--border-radius-md); /* rounded-md */
  display: flex;
  align-items: center;
  cursor: pointer;
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: var(--transition-duration-normal); /* duration-200 */
}

.conversation-selected {
  background-color: #e2e8f0; /* bg-slate-200 - 与豆包风格一致 */
}

.dark .conversation-selected {
  background-color: #334155; /* dark:bg-slate-700 */
}

.conversation-unselected:hover {
  background-color: #f1f5f9; /* hover:bg-slate-100 - 与豆包风格一致 */
}

.dark .conversation-unselected:hover {
  background-color: #1e293b; /* dark:hover:bg-slate-800 */
}

.conversation-title {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  font-size: var(--font-size-sm); /* text-sm */
  color: var(--color-gray-800); /* text-gray-800 */
  flex: 1;
}

.dark .conversation-title {
  color: var(--color-gray-200); /* dark:text-gray-200 */
}

.more-options-btn {
  margin-left: var(--spacing-sm); /* ml-2 */
  height: 1.5rem; /* h-6 */
  width: 1.5rem; /* w-6 */
  padding: var(--spacing-xs); /* p-1 */
  border-radius: var(--border-radius-md); /* rounded-md */
  color: var(--color-gray-500); /* text-gray-500 */
}

.more-options-btn:hover {
  background-color: var(--color-gray-200); /* hover:bg-gray-200 */
}

.dark .more-options-btn:hover {
  background-color: var(--color-gray-700); /* dark:hover:bg-gray-700 */
}

.dark .more-options-btn {
  color: var(--color-gray-400); /* dark:text-gray-400 */
}

.more-options-icon {
  height: var(--spacing-md); /* h-4 */
  width: var(--spacing-md); /* w-4 */
}

.more-options-dropdown {
  width: 8rem; /* w-32 */
}

.delete-menu-item {
  color: #dc2626; /* text-red-600 */
}

.dark .delete-menu-item {
  color: #f87171; /* dark:text-red-400 */
}

.delete-text {
  color: #dc2626; /* group:text-red-600 */
}

[data-highlighted] .delete-text {
  color: #dc2626; /* group-data-[highlighted]:text-red-600 */
}

.dark [data-highlighted] .delete-text {
  color: #f87171; /* dark:group-data-[highlighted]:text-red-400 */
}

.loading-message {
  padding-left: var(--spacing-sm); /* px-3 */
  padding-right: var(--spacing-sm); /* px-3 */
  padding-top: var(--spacing-sm); /* py-2 */
  padding-bottom: var(--spacing-sm); /* py-2 */
  font-size: var(--font-size-sm); /* text-sm */
  color: var(--color-gray-500); /* text-gray-500 */
  text-align: center; /* text-center */
}

.dark .loading-message {
  color: var(--color-gray-400); /* dark:text-gray-400 */
}

.error-message {
  padding-left: var(--spacing-sm); /* px-3 */
  padding-right: var(--spacing-sm); /* px-3 */
  padding-top: var(--spacing-sm); /* py-2 */
  padding-bottom: var(--spacing-sm); /* py-2 */
  font-size: var(--font-size-sm); /* text-sm */
  color: #ef4444; /* text-red-500 */
  text-align: center; /* text-center */
}

.dark .error-message {
  color: #f87171; /* dark:text-red-400 */
}

.rename-dialog-content {
  max-width: 26.5625rem; /* sm:max-w-[425px] */
}

.rename-dialog-body {
  display: grid;
  gap: var(--spacing-md); /* gap-4 */
  padding-top: var(--spacing-md); /* py-4 */
  padding-bottom: var(--spacing-md); /* py-4 */
}

.rename-input-container {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)); /* grid-cols-4 */
  align-items: center; /* items-center */
  gap: var(--spacing-md); /* gap-4 */
}

.rename-input {
  grid-column: span 4 / span 4; /* col-span-4 */
}

.delete-dialog-content {
  max-width: 26.5625rem; /* sm:max-w-[425px] */
}

.delete-dialog-body {
  padding-top: var(--spacing-md); /* py-4 */
  padding-bottom: var(--spacing-md); /* py-4 */
}

.delete-dialog-btn {
  background-color: #dc2626; /* bg-red-600 */
  color: white;
}

.delete-dialog-btn:hover {
  background-color: #b91c1c; /* hover:bg-red-700 */
}
</style>