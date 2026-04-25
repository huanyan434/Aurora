<template>
  <div class="conversations-container">
    <!-- 所有对话筛选 - 可折叠 -->
    <div class="all-conversations-header" @click="toggleAllConversations">
      <svg 
        :class="['expand-icon', { 'expanded': isAllConversationsExpanded }]" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
      <span>所有对话</span>
    </div>

    <!-- 按时间分组的对话列表 -->
    <div v-show="isAllConversationsExpanded">
      <div v-for="group in groupedConversations" :key="group.title" class="time-group">
        <div class="time-group-title">
          {{ group.title }}
        </div>
        <div v-for="conversation in group.conversations" :key="conversation.id" :class="[
          'conversation-item',
          selectedConversationId === conversation.id ? 'conversation-selected' : 'conversation-unselected'
        ]" @click="handleSelectConversation(conversation.id)">
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
                      <Ellipsis class="more-options-icon" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent class="more-options-dropdown">
                    <DropdownMenuItem @click.stop="renameConversationHandler(conversation)" class="rename-menu-item">
                      <PenLine class="menu-item-icon" />
                      <span>重命名</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem @click.stop="deleteConversationHandler(conversation)" class="delete-menu-item">
                      <Trash2 class="menu-item-icon" />
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
      </div>
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
import { ref, onMounted, watch, computed } from 'vue';
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
import { Ellipsis, PenLine, Trash2 } from 'lucide-vue-next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';


interface Props {
  searchQuery?: string;
}

const props = withDefaults(defineProps<Props>(), {
  searchQuery: '',
});

// 获取聊天store


const emit = defineEmits<{
  conversationSelected: [];
}>();
const chatStore = useChatStore();


const selectedConversationId = ref<number | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const showRenameDialog = ref(false);
const showDeleteDialog = ref(false);
const renameInput = ref('');
const currentConversation = ref<any>(null);
const isAllConversationsExpanded = ref(true);

// 搜索过滤后的对话列表
const filteredConversations = computed(() => {
  if (!props.searchQuery) {
    return chatStore.conversations;
  }
  
  const query = props.searchQuery.toLowerCase().trim();
  return chatStore.conversations.filter(conv => 
    conv.title.toLowerCase().includes(query)
  );
});

// 获取路由和路由器
const route = useRoute();
const router = useRouter();

// 切换所有对话的折叠状态
const toggleAllConversations = () => {
  isAllConversationsExpanded.value = !isAllConversationsExpanded.value;
};

// 按时间分组显示对话
const groupedConversations = computed(() => {
  const conversations = filteredConversations.value;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThisYear = new Date(now.getFullYear(), 0, 1).getTime();
  const startOfLast30Days = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const startOfLast7Days = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  const today: any[] = [];
  const past7Days: any[] = [];
  const past30Days: any[] = [];
  const monthGroups = new Map<string, any[]>();
  const yearGroups = new Map<string, any[]>();

  const monthOrder = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const monthLabel = (date: Date) => {
    const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    return `${months[date.getMonth()]}月`;
  };
  const yearLabel = (date: Date) => `${date.getFullYear()}年`;

  for (const conv of conversations) {
    const convDate = new Date(conv.updatedAt || conv.createdAt);
    const convTime = convDate.getTime();

    if (Number.isNaN(convTime)) {
      continue;
    }

    if (convTime >= startOfToday) {
      today.push(conv);
      continue;
    }

    if (convTime >= startOfLast7Days) {
      past7Days.push(conv);
      continue;
    }

    if (convTime >= startOfLast30Days) {
      past30Days.push(conv);
      continue;
    }

    if (convTime >= startOfThisYear) {
      const key = monthOrder(convDate);
      const items = monthGroups.get(key) ?? [];
      items.push(conv);
      monthGroups.set(key, items);
      continue;
    }

    const key = yearLabel(convDate);
    const items = yearGroups.get(key) ?? [];
    items.push(conv);
    yearGroups.set(key, items);
  }

  const result: Array<{ title: string; conversations: any[] }> = [];
  if (today.length > 0) result.push({ title: '今天', conversations: today });
  if (past7Days.length > 0) result.push({ title: '过去 7 天', conversations: past7Days });
  if (past30Days.length > 0) result.push({ title: '过去 30 天', conversations: past30Days });

  const months = Array.from(monthGroups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  for (const [key, items] of months) {
    const [year, month] = key.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    result.push({ title: monthLabel(date), conversations: items });
  }

  const years = Array.from(yearGroups.entries())
    .sort((a, b) => Number(b[0].replace('年', '')) - Number(a[0].replace('年', '')));
  for (const [title, items] of years) {
    result.push({ title, conversations: items });
  }

  return result;
});

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

// 处理选择对话（先触发事件再选择）
const handleSelectConversation = (id: number) => {
  emit('conversationSelected');
  selectConversation(id);
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

/* 所有对话标题 */
.all-conversations-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-left: var(--spacing-sm);
  padding-right: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--border-radius-md);
  transition: background-color 0.2s;
}

.all-conversations-header:hover {
  background-color: #E5E7EB;
}

.dark .all-conversations-header:hover {
  background-color: #374151;
}

.dark .all-conversations-header {
  color: var(--sidebar-text-secondary-color);
}

.expand-icon {
  width: 1rem;
  height: 1rem;
  color: #9CA3AF;
  transition: transform 0.2s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.dark .expand-icon {
  color: #6B7280;
}

/* 时间分组 */
.time-group {
  margin-top: 0.5rem;
}

.time-group-title {
  padding-left: var(--spacing-sm);
  padding-right: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-gray-500);
  font-weight: 500;
}

.dark .time-group-title {
  color: var(--sidebar-text-secondary-color);
}

/* 滚动条样式 */
.conversations-container::-webkit-scrollbar {
  width: 8px;
}

.conversations-container::-webkit-scrollbar-track {
  background: var(--scrollbar-track-bg);
}

.conversations-container::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb-bg);
  border-radius: 4px;
}

.conversations-container::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover-bg);
}

/* 深色模式滚动条样式 */
.dark .conversations-container::-webkit-scrollbar {
  width: 8px;
}

.dark .conversations-container::-webkit-scrollbar-track {
  background: #374151;
}

.dark .conversations-container::-webkit-scrollbar-thumb {
  background: #525252; /* 灰色滚动条颜色，与MessagesContainer保持一致 */
  border-radius: 4px;
}

.dark .conversations-container::-webkit-scrollbar-thumb:hover {
  background: #404040; /* 深灰色悬停颜色，与MessagesContainer保持一致 */
}

.conversation-item {
  width: 100%;
  padding-left: var(--spacing-sm); /* px-3 */
  padding-right: var(--spacing-sm); /* px-3 */
  padding-top: var(--spacing-sm); /* py-2 */
  padding-bottom: var(--spacing-sm); /* py-2 */
  margin-bottom: var(--spacing-xs); /* mb-1 */
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  cursor: pointer;
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: var(--transition-duration-normal); /* duration-200 */
}

.conversation-selected {
  background-color: var(--color-slate-200); /* bg-slate-200 - 与豆包风格一致 */
}

.dark .conversation-selected {
  background-color: var(--sidebar-item-selected-bg); /* 使用新的深色模式变量 */
}

.conversation-unselected:hover {
  background-color: var(--color-slate-100); /* hover:bg-slate-100 - 与豆包风格一致 */
}

.dark .conversation-unselected:hover {
  background-color: var(--sidebar-item-hover-bg); /* 使用新的深色模式变量 */
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
  color: var(--sidebar-text-color); /* 使用新的深色模式变量 */
}

.more-options-btn {
  margin-left: var(--spacing-sm); /* ml-2 */
  height: 1.5rem; /* h-6 */
  width: 1.5rem; /* w-6 */
  padding: var(--spacing-xs); /* p-1 */
  border-radius: var(--border-radius-md); /* rounded-md */
  color: var(--color-gray-500); /* text-gray-500 */
  cursor: pointer;
  flex-shrink: 0;
}

.more-options-btn:hover {
  background-color: var(--color-gray-200); /* hover:bg-gray-200 */
}

.dark .more-options-btn:hover {
  background-color: var(--btn-secondary-hover-bg); /* 使用新的深色模式变量 */
}

.dark .more-options-btn {
  color: var(--sidebar-text-secondary-color); /* 使用新的深色模式变量 */
}

.more-options-icon {
  height: var(--spacing-md); /* h-4 */
  width: var(--spacing-md); /* w-4 */
}

.menu-item-icon {
  width: 0.95rem;
  height: 0.95rem;
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.rename-menu-item {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.delete-menu-item {
  cursor: pointer;
  color: var(--color-red-600); /* text-red-600 */
  display: flex;
  align-items: center;
}

.dark .delete-menu-item {
  color: #f87171; /* dark:text-red-400 */
}

.delete-text {
  color: var(--color-red-600); /* group:text-red-600 */
}

[data-highlighted] .delete-text {
  color: var(--color-red-600); /* group-data-[highlighted]:text-red-600 */
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
  color: var(--sidebar-text-secondary-color); /* 使用新的深色模式变量 */
}

.error-message {
  padding-left: var(--spacing-sm); /* px-3 */
  padding-right: var(--spacing-sm); /* px-3 */
  padding-top: var(--spacing-sm); /* py-2 */
  padding-bottom: var(--spacing-sm); /* py-2 */
  font-size: var(--font-size-sm); /* text-sm */
  color: var(--color-red-500); /* text-red-500 */
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
  background-color: var(--color-red-600); /* bg-red-600 */
  color: white;
}

.delete-dialog-btn:hover {
  background-color: #b91c1c; /* hover:bg-red-700 */
}
</style>
