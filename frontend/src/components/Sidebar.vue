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
  background-color: #f8fafc; /* light:bg-slate-50 - 豆包风格的浅灰色背景 */
  width: 18rem; /* w-72 (18*4 = 72 = 18rem) */
}

.dark .sidebar-container {
  background-color: #0f172a; /* dark:bg-slate-900 - 深色模式下的背景 */
}

/* 移除分割线，通过颜色区分侧边栏和主内容 */
</style>