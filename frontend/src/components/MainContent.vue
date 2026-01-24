<template>
  <div class="main-content-container">
    <!-- Top Bar -->
    <TopBar />

    <!-- Messages Container 或者欢迎界面 -->
    <div class="main-content-area">
      <div
        v-if="isHomeRoute"
        class="welcome-container"
      >
        <h1 class="welcome-title">{{ greeting }}, 有什么可以帮你？</h1>
        <!-- 居中的inputarea -->
        <div class="welcome-input-container">
          <InputArea />
        </div>
      </div>
      <div v-else class="messages-container-wrapper">
        <MessagesContainer class="messages-container" />
      </div>
    </div>

    <!-- 在对话界面中inputarea始终固定在底部 -->
    <div v-if="!isHomeRoute">
      <InputArea />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import TopBar from './TopBar.vue';
import MessagesContainer from './MessagesContainer.vue';
import InputArea from './InputArea.vue';

const route = useRoute();

// 判断是否为首页路由
const isHomeRoute = computed(() => route.path === '/');

// 计算问候语
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return '早上好';
  } else if (hour >= 12 && hour < 18) {
    return '下午好';
  } else {
    return '晚上好';
  }
});
</script>

<style scoped>
.main-content-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff; /* 白色背景，与侧边栏形成对比 */
}

.dark .main-content-container {
  background-color: #020817; /* 深色模式下的主内容背景 */
}

.main-content-area {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md); /* p-4 */
}

.welcome-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: calc(-1 * var(--spacing-2xl)); /* -mt-12 */
}

.welcome-title {
  font-size: var(--font-size-3xl); /* text-3xl */
  font-weight: 700; /* font-bold */
  color: var(--color-gray-800); /* text-gray-800 */
  margin-bottom: var(--spacing-lg); /* mb-6 */
}

.dark .welcome-title {
  color: var(--color-gray-200); /* dark:text-gray-200 */
}

.welcome-input-container {
  width: 100%;
  max-width: var(--max-width-2xl); /* max-w-2xl */
}

.messages-container-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.messages-container {
  flex: 1;
}

.dark .messages-container {
  scrollbar-color: #4b5563 #1f2937;
}
</style>