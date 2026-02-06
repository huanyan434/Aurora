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
import { ref } from "vue";
import { useSidebarStore } from "@/stores/sidebar";
import SidebarHeader from "./SidebarHeader.vue";
import ConversationsList from "./ConversationsList.vue";

interface Props {
    toggleSidebar?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
    toggleSidebar: () => {},
});

const sidebarStore = useSidebarStore();

// 对话列表组件引用
const conversationsListRef = ref<InstanceType<typeof ConversationsList> | null>(
    null,
);

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
    background-color: #f8fafc; /* light:bg-slate-50 */
    width: v-bind(
        'sidebarStore.collapsed ? "3rem" : "18rem"'
    ); /* 根据折叠状态动态设置宽度 */
    min-width: 0; /* 允许收缩到更小的尺寸 */
    transition: width 0.3s ease; /* 添加过渡动画 */
    overflow: hidden; /* 防止内容溢出 */
}

.dark .sidebar-container {
    background-color: var(--sidebar-bg); /* 使用新的深色模式变量 */
}

/* 移除分割线，通过颜色区分侧边栏和主内容 */
</style>
