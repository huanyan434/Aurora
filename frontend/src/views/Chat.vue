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
import { ref, onMounted, onUnmounted } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import MainContent from '@/components/MainContent.vue';

const sidebarStore = useSidebarStore();
const isMobile = ref(false);

// 检测屏幕尺寸并设置isMobile标志
const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768;
};

// 初始化
onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
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
  ease-in-out: ease-in-out; /* ease-in-out */
  display: flex;
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