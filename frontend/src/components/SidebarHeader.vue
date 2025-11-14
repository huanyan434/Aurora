<template>
  <div class="sidebar-header-container">
    <!-- Aurora标题和内部折叠按钮 -->
    <div class="header-content">
      <div class="app-title">Aurora</div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="toggle-btn"
              @click="toggleGlobalSidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="toggle-btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>收起侧边栏</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <!-- 开启新对话按钮 -->
    <Button
      class="new-conversation-btn"
      @click="handleNewConversation"
    >
      + 开启新对话
    </Button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useSidebarStore } from '@/stores/sidebar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

const router = useRouter();
const sidebarStore = useSidebarStore();

// 定义事件
const emits = defineEmits(['newConversation']);

const toggleGlobalSidebar = () => {
  sidebarStore.toggleSidebar();
};

const handleNewConversation = () => {
  // 跳转到根路由
  router.push('/');
  // 发出事件通知父组件
  emits('newConversation');
};
</script>

<style scoped>
.sidebar-header-container {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md); /* p-4 */
  gap: var(--spacing-md); /* space-y-4 */
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-title {
  font-size: var(--font-size-2xl); /* text-2xl */
  font-weight: 700; /* font-bold */
  color: var(--color-black); /* text-black */
}

.dark .app-title {
  color: var(--color-white); /* dark:text-white */
}

.toggle-btn {
  padding: var(--spacing-xs); /* p-1 */
  border-radius: var(--border-radius-md); /* rounded-md */
  color: var(--color-gray-600); /* text-gray-700 */
}

.toggle-btn:hover {
  background-color: var(--color-gray-200); /* hover:bg-gray-200 */
}

.dark .toggle-btn:hover {
  background-color: var(--color-gray-700); /* dark:hover:bg-gray-700 */
}

.dark .toggle-btn {
  color: var(--color-gray-300); /* dark:text-gray-300 */
}

.toggle-btn-icon {
  height: var(--spacing-lg); /* h-5 */
  width: var(--spacing-lg); /* w-5 */
}

.new-conversation-btn {
  width: 100%; /* w-full */
  padding-left: var(--spacing-md); /* px-4 */
  padding-right: var(--spacing-md); /* px-4 */
  padding-top: var(--spacing-sm); /* py-2 */
  padding-bottom: var(--spacing-sm); /* py-2 */
  background-color: var(--color-black); /* bg-black */
  color: var(--color-white); /* text-white */
  border-radius: var(--border-radius-md); /* rounded-md */
  transition-property: background-color, border-color, color, fill, stroke; /* transition-colors */
  transition-duration: var(--transition-duration-normal); /* duration-200 */
  display: flex;
  align-items: center; /* items-center */
  justify-content: center; /* justify-center */
}

.new-conversation-btn:hover {
  background-color: var(--color-gray-800); /* hover:bg-gray-800 */
}

.dark .new-conversation-btn {
  background-color: var(--color-white); /* dark:bg-white */
  color: var(--color-black); /* dark:text-black */
}

.dark .new-conversation-btn:hover {
  background-color: var(--color-gray-200); /* dark:hover:bg-gray-200 */
}
</style>