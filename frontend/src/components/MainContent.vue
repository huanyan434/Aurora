<template>
  <div class="main-content-container">
    <!-- Top Bar -->
    <TopBar @open-settings="$emit('open-settings')" />

    <!-- Messages Container 或者欢迎界面 -->
    <div class="main-content-area">
      <div
        class="welcome-container"
        v-if="isHomeRoute"
      >

        <h1 class="welcome-title">{{ greeting }}, 有什么可以帮你？</h1>
        <!-- 居中的inputarea -->
        <div class="welcome-input-container">
          <InputArea ref="homeInputAreaRef" />
        </div>
      </div>
      <div :class="{ 'messages-layer': true }" v-if="!isHomeRoute">
        <div :class="{ 'messages-loading-layer': true, 'visible': !messagesReady }">
          <LoadingLogo />
        </div>
        <div :class="{ 'messages-container-wrapper': true, 'visible': messagesReady }" ref="messagesContainerWrapperRef">
          <MessagesContainer
            class="messages-container"
            @render-complete="handleMessagesRenderComplete"
          />
        </div>
      </div>
    </div>

    <!-- 在对话界面中inputarea始终固定在底部 -->
    <div v-if="!isHomeRoute">
      <InputArea ref="chatInputAreaRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import TopBar from './TopBar.vue';
import MessagesContainer from './MessagesContainer.vue';
import InputArea from './InputArea.vue';
import LoadingLogo from './LoadingLogo.vue';

const route = useRoute();
const homeInputAreaRef = ref<InstanceType<typeof InputArea> | null>(null);
const chatInputAreaRef = ref<InstanceType<typeof InputArea> | null>(null);
const messagesReady = ref(false);
const loadingStartTime = ref(0);
let loadingTimer: number | undefined;

// 定义 emit
const emit = defineEmits(['open-settings']);

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

const handleMessagesRenderComplete = (value: boolean) => {
  if (!value) {
    messagesReady.value = false;
    return;
  }
  messagesReady.value = true;
};


const focusInputArea = async () => {
  if (isHomeRoute.value) {
    homeInputAreaRef.value?.focusMessageInput?.();
    return;
  }
  chatInputAreaRef.value?.focusMessageInput?.();
};

const handleExternalFocusInputArea = () => {
  focusInputArea();
};

if (typeof window !== 'undefined') {
  window.addEventListener('focus-input-area', handleExternalFocusInputArea);
}

watch(
  () => route.path,
  (path, prevPath) => {
    if (path === '/') {
      messagesReady.value = false;
      if (loadingTimer !== undefined) {
        window.clearTimeout(loadingTimer);
        loadingTimer = undefined;
      }
      return;
    }

    if (path !== prevPath && path.startsWith('/c/')) {
      messagesReady.value = false;
      loadingStartTime.value = Date.now();
      if (loadingTimer !== undefined) {
        window.clearTimeout(loadingTimer);
        loadingTimer = undefined;
      }
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (loadingTimer !== undefined) {
    window.clearTimeout(loadingTimer);
    loadingTimer = undefined;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus-input-area', handleExternalFocusInputArea);
  }
});

defineExpose({
  focusInputArea,
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
  background-color: var(--chat-bg); /* 使用新的深色模式变量 */
}

.main-content-area {
  flex: 1;
  overflow: hidden;
  position: relative;
  overflow-y: auto;
  padding: var(--spacing-md); /* p-4 */
  min-height: 0;
}

.welcome-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 20px;
  transition: opacity 0.3s ease;
}

.welcome-container.hidden {
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}

.welcome-title {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 32px;
  background: linear-gradient(90deg, #18181b, #27272a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (max-width: 768px) {
  .welcome-title {
    font-size: 24px;
  }
}

.welcome-input-container {
  width: 100%;
  max-width: 768px;
}

.messages-layer {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 100%;
}

.messages-layer.hidden {
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}

.messages-loading-layer {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.messages-loading-layer.visible {
  visibility: visible;
  position: relative;
  opacity: 1;
  pointer-events: auto;
}

.messages-container-wrapper {
  flex: 1;
  display: flex;
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  height: 100%;
  flex-direction: column;
}

.messages-container-wrapper.visible {
  visibility: visible;
  position: relative;
  opacity: 1;
  pointer-events: auto;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  width: 100%;
  height: 100%;
  word-break: break-all;
  overflow-x: hidden;
}

/* 深色模式适配 */
.dark .welcome-title {
  background: linear-gradient(90deg, #fafafa, #e5e7eb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.dark .messages-container {
  scrollbar-color: #525252 #262626; /* 灰色黑色主题滚动条颜色 */
}
</style>