<template>
  <div class="main-content-container">
    <!-- Top Bar -->
    <TopBar @open-settings="$emit('open-settings')" />

    <!-- Messages Container 或者欢迎界面 -->
    <div class="main-content-area">
      <div
        class="welcome-container"
        v-show="isHomeRoute"
      >

        <h1 class="welcome-title">{{ greeting }}, 有什么可以帮你？</h1>
        <!-- 居中的inputarea -->
        <div class="welcome-input-container">
          <InputArea ref="homeInputAreaRef" />
        </div>
      </div>
      <div v-show="!isHomeRoute" class="messages-layer">
        <div class="messages-loading-layer" v-show="!messagesReady">
          <LoadingLogo />
        </div>
        <div class="messages-container-wrapper" v-show="messagesReady">
          <MessagesContainer class="messages-container" @render-complete="handleMessagesRenderComplete" />
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
import { computed, nextTick, ref, watch } from 'vue';
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

const scrollMessagesAreaToBottom = async () => {
  await nextTick();
  const container = document.querySelector('.main-content-area');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
};

const handleMessagesRenderComplete = (value: boolean) => {
  if (!value) {
    if (loadingTimer !== undefined) {
      window.clearTimeout(loadingTimer);
      loadingTimer = undefined;
    }
    loadingStartTime.value = Date.now();
    messagesReady.value = false;
    return;
  }

  const elapsed = Date.now() - loadingStartTime.value;
  const remaining = Math.max(0, 1000 - elapsed);

  if (loadingTimer !== undefined) {
    window.clearTimeout(loadingTimer);
  }

  loadingTimer = window.setTimeout(async () => {
    messagesReady.value = true;
    loadingTimer = undefined;
    await scrollMessagesAreaToBottom();
  }, remaining);
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
  overflow-y: auto;
  padding: var(--spacing-md); /* p-4 */
  min-height: 0;
}

.messages-layer {
  position: relative;
  min-height: 100%;
}

.messages-loading-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
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
  color: var(--sidebar-text-color); /* 使用新的深色模式变量 */
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
  word-break: break-all;
  overflow-x: hidden;
}

.dark .messages-container {
  scrollbar-color: #525252 #262626; /* 灰色黑色主题滚动条颜色 */
}
</style>