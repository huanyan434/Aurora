<template>
  <div class="sidebar-container">
    <!-- 侧边栏上部 -->
    <SidebarHeader
      :toggle-sidebar="props.toggleSidebar"
      :is-mobile-toggle-visible="!sidebarStore.collapsed"
      @new-conversation="handleNewConversation"
    />

    <!-- 分割线 -->
    <div class="sidebar-divider"></div>

    <!-- 对话列表 -->
    <ConversationsList ref="conversationsListRef" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSidebarStore } from '@/stores/sidebar';
import SidebarHeader from './SidebarHeader.vue';
import ConversationsList from './ConversationsList.vue';

interface Props {
  toggleSidebar?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  toggleSidebar: () => {}
});

const sidebarStore = useSidebarStore();

// 对话列表组件引用
const conversationsListRef = ref<InstanceType<typeof ConversationsList> | null>(null);

// 处理新建对话事件
const handleNewConversation = () => {
  // 刷新对话列表
  if (conversationsListRef.value) {
    conversationsListRef.value.reloadConversations();
  }
};
</script>

<style scoped>
.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-white); /* bg-white */
  width: 18rem; /* w-72 (18*4 = 72 = 18rem) */
  border-right-width: 1px; /* border-r */
  border-color: var(--color-gray-200); /* border-gray-200 */
}

.dark .sidebar-container {
  background-color: var(--color-black); /* dark:bg-black */
  border-color: var(--color-gray-800); /* dark:border-gray-800 */
}

.sidebar-divider {
  border-top-width: 1px; /* border-t */
  border-color: var(--color-gray-200); /* border-gray-200 */
  margin-top: var(--spacing-sm); /* my-2 */
  margin-bottom: var(--spacing-sm); /* my-2 */
}

.dark .sidebar-divider {
  border-color: var(--color-gray-800); /* dark:border-gray-800 */
}
</style>