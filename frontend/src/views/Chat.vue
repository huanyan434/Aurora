<template>
  <div class="chat-container">
    <!-- 遮罩层，只在移动端且侧边栏展开时显示 -->
    <div
      v-if="isMobile && !sidebarStore.collapsed"
      class="overlay"
      @click="closeSidebarOnMobile"
    ></div>

    <!-- 左侧侧边栏 -->
    <div
      class="sidebar-wrapper"
      :class="{ 'mobile-open': isMobile && !sidebarStore.collapsed }"
      :style="{
        width: sidebarStore.collapsed && !isMobile ? '0' : '18rem',
        transform: isMobile && !sidebarStore.collapsed ? 'translateX(0)' : (isMobile && sidebarStore.collapsed ? 'translateX(-100%)' : 'none')
      }"
      style="overflow: hidden;"
    >
      <div
        class="sidebar-content"
        :style="{ opacity: (sidebarStore.collapsed && !isMobile) ? 0 : 1 }"
      >
        <Sidebar :toggleSidebar="toggleSidebarForMobile" />
      </div>
    </div>

    <!-- 右侧主内容区域 -->
    <div class="main-content-wrapper" :class="{ 'main-content-collapsed': sidebarStore.collapsed && !isMobile }">
      <MainContent />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import MainContent from '@/components/MainContent.vue';

const sidebarStore = useSidebarStore();
const isMobile = ref(false);

// 自动折叠阈值（像素）
const COLLAPSE_THRESHOLD = 1200;

// 检测屏幕尺寸并设置isMobile标志
const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768;
};

// 检查是否需要自动折叠侧边栏
const checkAutoCollapse = () => {
  if (window.innerWidth < COLLAPSE_THRESHOLD && !sidebarStore.collapsed) {
    sidebarStore.setSidebarCollapsed(true);
  }
};

// 初始化
onMounted(() => {
  checkScreenSize();
  checkAutoCollapse(); // 检查初始状态
  window.addEventListener('resize', () => {
    checkScreenSize();
    checkAutoCollapse();
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});

// 移动端关闭侧边栏
const closeSidebarOnMobile = () => {
  if (isMobile.value) {
    sidebarStore.setSidebarCollapsed(true);
  }
};

// 切换侧边栏（适用于所有模式）
const toggleSidebarForMobile = () => {
  sidebarStore.toggleSidebar();
};

// 监听侧边栏状态变化
watch(() => sidebarStore.collapsed, (newCollapsed) => {
  // 当侧边栏展开且窗口宽度大于阈值时，允许展开
  if (!newCollapsed && window.innerWidth >= COLLAPSE_THRESHOLD) {
    // 什么都不做，保持展开状态
  }
  // 当侧边栏展开但窗口宽度小于阈值时，强制折叠
  else if (!newCollapsed && window.innerWidth < COLLAPSE_THRESHOLD) {
    sidebarStore.setSidebarCollapsed(true);
  }
});
</script>

<style scoped>
.chat-container {
  display: flex;
  height: var(--height-screen); /* h-screen */
  background-color: var(--color-white); /* bg-white */
  color: var(--color-gray-900); /* text-gray-900 */
}

.dark .chat-container {
  background-color: var(--color-black); /* dark:bg-black */
  color: var(--color-gray-100); /* dark:text-gray-100 */
}

.sidebar-wrapper {
  height: 100%;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: var(--transition-duration-slow); /* duration-300 */
  display: flex;
  min-width: 0; /* 允许收缩 */
}

.main-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: margin-left var(--transition-duration-slow) ease-in-out;
}

.main-content-collapsed {
  margin-left: 0; /* ml-0 */
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 998;
  transition: opacity var(--transition-duration-slow) ease-in-out;
}

/* 移动端样式 */
@media (max-width: 767px) {
  .sidebar-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 999;
    transform: translateX(-100%);
    width: 80% !important; /* 移动端侧边栏宽度 */
    max-width: 20rem; /* 最大宽度限制 */
  }

  .sidebar-wrapper.mobile-open {
    transform: translateX(0);
  }

  .main-content-wrapper {
    position: relative;
    z-index: 10;
  }
}
</style>