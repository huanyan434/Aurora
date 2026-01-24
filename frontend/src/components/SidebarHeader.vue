<template>
  <div class="sidebar-header-container">
    <!-- Aurora标题和内部折叠按钮 -->
    <div class="header-content">
      <div v-if="!isCollapsed" class="app-title">Aurora</div>
      <Button
        variant="ghost"
        size="icon"
        class="toggle-btn"
        :class="{ 'mobile-toggle-visible': isMobileToggleVisible }"
        @click="toggleGlobalSidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="toggle-btn-icon" fill="currentColor" viewBox="0 0 24 24">
          <path fill-rule="evenodd" d="M21 5H11v14h10zM3 5h6v14H3zm0-2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm2 4.25a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5zm-.75 3.5A.75.75 0 0 1 5 10h2a.75.75 0 0 1 0 1.5H5a.75.75 0 0 1-.75-.75m.75 2a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5z" clip-rule="evenodd"></path>
        </svg>
      </Button>
    </div>

    <!-- 开启新对话按钮 -->
    <Button
      v-if="!isCollapsed"
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

interface Props {
  isMobileToggleVisible?: boolean;
  toggleSidebar?: () => void;
  isCollapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isMobileToggleVisible: false,
  toggleSidebar: () => {
    // 默认行为：使用全局状态管理器
    const store = useSidebarStore();
    store.toggleSidebar();
    return;
  },
  isCollapsed: false
});

const router = useRouter();

// 使用传入的函数或默认行为
const toggleGlobalSidebar = () => {
  if (typeof props.toggleSidebar === 'function') {
    props.toggleSidebar();
  } else {
    const store = useSidebarStore();
    store.toggleSidebar();
  }
};

const handleNewConversation = () => {
  // 跳转到根路由
  router.push('/');
  // 触发可能的事件通知父组件
  // （如果父组件监听了此事件的话）
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
  color: var(--color-gray-800); /* text-gray-800 - 与新背景协调 */
  white-space: nowrap; /* 防止文本换行 */
  overflow: hidden; /* 隐藏溢出的文本 */
  text-overflow: ellipsis; /* 显示省略号 */
}

.dark .app-title {
  color: var(--color-gray-100); /* dark:text-gray-100 */
}

.toggle-btn {
  padding: var(--spacing-xs); /* p-1 */
  border-radius: var(--border-radius-md); /* rounded-md */
  color: var(--color-gray-600); /* text-gray-600 */
}

.toggle-btn:hover {
  background-color: var(--color-gray-300); /* hover:bg-gray-300 - 与新背景协调 */
}

.dark .toggle-btn:hover {
  background-color: var(--color-gray-600); /* dark:hover:bg-gray-600 */
}

.dark .toggle-btn {
  color: var(--color-gray-400); /* dark:text-gray-400 */
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
  background-color: var(--color-white); /* bg-white - 与豆包风格一致 */
  color: var(--color-gray-800); /* text-gray-800 */
  border: 1px solid var(--color-gray-300); /* 边框与背景形成对比 */
  border-radius: var(--border-radius-md); /* rounded-md */
  transition-property: background-color, border-color, color, fill, stroke; /* transition-colors */
  transition-duration: var(--transition-duration-normal); /* duration-200 */
  display: flex;
  align-items: center; /* items-center */
  justify-content: center; /* justify-center */
  white-space: nowrap; /* 防止文本换行 */
  overflow: hidden; /* 隐藏溢出的文本 */
  text-overflow: ellipsis; /* 显示省略号 */
}

.new-conversation-btn:hover {
  background-color: var(--color-gray-100); /* hover:bg-gray-100 */
  border-color: var(--color-gray-400); /* hover:border-gray-400 */
}

.dark .new-conversation-btn {
  background-color: var(--color-gray-800); /* dark:bg-gray-800 */
  color: var(--color-white); /* dark:text-white */
  border-color: var(--color-gray-600); /* dark:border-gray-600 */
}

.dark .new-conversation-btn:hover {
  background-color: var(--color-gray-700); /* dark:hover:bg-gray-700 */
  border-color: var(--color-gray-500); /* dark:hover:border-gray-500 */
}

/* 仅在移动端开启侧边栏时显示切换按钮 */
.toggle-btn:not(.mobile-toggle-visible) {
  display: none;
}

@media (min-width: 768px) {
  /* 桌面端始终显示切换按钮 */
  .toggle-btn:not(.mobile-toggle-visible) {
    display: block;
  }
}

</style>