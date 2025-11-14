<template>
  <div class="chat-container">
    <!-- 左侧侧边栏 -->
    <div
      class="sidebar-wrapper"
      :style="{ width: sidebarStore.collapsed ? '0' : '18rem' }"
      style="overflow: hidden;"
    >
      <div
        class="sidebar-content"
        :style="{ opacity: sidebarStore.collapsed ? 0 : 1 }"
      >
        <Sidebar />
      </div>
    </div>

    <!-- 右侧主内容区域 -->
    <div class="main-content-wrapper" :class="{ 'main-content-collapsed': sidebarStore.collapsed }">
      <MainContent />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar';
import Sidebar from '@/components/Sidebar.vue';
import MainContent from '@/components/MainContent.vue';

const sidebarStore = useSidebarStore();
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

.sidebar-content {
  height: 100%;
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: var(--transition-duration-slow); /* duration-300 */
  ease-in-out: ease-in-out; /* ease-in-out */
}

.main-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.main-content-collapsed {
  margin-left: 0; /* ml-0 */
}
</style>