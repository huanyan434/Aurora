<template>
  <div class="sidebar-container">
    <!-- 侧边栏上部 -->
    <SidebarHeader
      :toggle-sidebar="props.toggleSidebar"
      :is-mobile-toggle-visible="!sidebarStore.collapsed"
      :is-collapsed="sidebarStore.collapsed"
      @new-conversation="handleNewConversation"
    />

    <!-- 分割线 -->
    <div class="sidebar-divider"></div>

    <!-- 对话列表 -->
    <ConversationsList ref="conversationsListRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
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

// 自动折叠阈值（像素）
const COLLAPSE_THRESHOLD = 300;

// 处理窗口大小变化
const handleResize = () => {
  if (window.innerWidth < COLLAPSE_THRESHOLD && !sidebarStore.collapsed) {
    sidebarStore.setSidebarCollapsed(true);
  }
};

// 组件挂载时添加事件监听器
onMounted(() => {
  window.addEventListener('resize', handleResize);
  // 初始化时也检查一次
  handleResize();
});

// 组件卸载时移除事件监听器
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

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
  width: v-bind('sidebarStore.collapsed ? "3rem" : "18rem"'); /* 根据折叠状态动态设置宽度 */
  min-width: 0; /* 允许收缩到更小的尺寸 */
  transition: width 0.3s ease; /* 添加过渡动画 */
  overflow: hidden; /* 防止内容溢出 */
}

.dark .sidebar-container {
  background-color: #0f172a; /* dark:bg-slate-900 - 深色模式下的背景 */
}

/* 移除分割线，通过颜色区分侧边栏和主内容 */
</style>