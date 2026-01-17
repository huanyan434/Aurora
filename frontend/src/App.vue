<template>
  <div v-if="modelsLoaded">
    <router-view />
    <Toast />
  </div>
  <div v-else class="flex items-center justify-center h-screen bg-white dark:bg-black">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
      <p class="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useChatStore } from './stores/chat'
import Toast from './components/ui/toast/Toast.vue'

const modelsLoaded = ref(false)
const chatStore = useChatStore()

onMounted(async () => {
  if (!chatStore.modelsLoaded) {
    await chatStore.fetchModels()
  }
  modelsLoaded.value = true
})
</script>

<style>
:root {
  /* 间距变量 */
  --input-container-padding: 1.25rem;
  --input-padding-right: 3rem;
  --input-padding-left: 1rem;
  --input-margin-top: 0.8rem;
  --input-margin-bottom: 0.5rem;
  --input-area-horizontal-padding: 1rem;
  --input-area-bottom-padding: 1rem;
  --input-area-max-width: 48rem;
  --input-area-min-width: 20rem;
  --spacing-between-buttons: 0.5rem;

  /* 尺寸变量 */
  --button-size: 2rem;
  --button-icon-size: 1rem;
  --input-max-height: 20rem;
  --input-min-height: 2rem;
  --input-container-border-radius: 0.75rem;
  --input-border-radius: 0.5rem;
  --input-field-border-radius: 0.375rem; /* rounded-md */
  --input-field-padding-x: 0.75rem; /* px-3 */
  --input-field-padding-y: 0.5rem; /* py-2 */

  /* 文字变量 */
  --input-text-size: 0.875rem;
  --input-line-height: 1.25rem;

  /* 颜色变量 */
  --input-container-border-color: #e5e7eb;
  --reasoning-button-bg: #3b82f6;
  --reasoning-button-hover-bg: #2563eb;
  --reasoning-button-text: #ffffff;
  --input-placeholder-color: #6b7280; /* text-muted-foreground */
  --color-gray-800: #1f2937;
  --color-gray-200: #e5e7eb;

  /* InputArea 特定变量 */
  --input-button-group-left: 0.5rem;
  --input-button-group-bottom: 0.5rem;

  /* 通用间距变量 */
  --spacing-xs: 0.25rem;          /* 4px */
  --spacing-sm: 0.5rem;           /* 8px */
  --spacing-md: 1rem;             /* 16px */
  --spacing-lg: 1.5rem;           /* 24px */
  --spacing-xl: 2rem;             /* 32px */
  --spacing-2xl: 3rem;            /* 48px */
  --spacing-3xl: 4rem;            /* 64px */
  --spacing-2-5xl: 6rem;          /* 96px */
  --spacing-3-5xl: 8rem;          /* 128px */

  /* 边框半径变量 */
  --border-radius-none: 0;
  --border-radius-sm: 0.125rem;   /* 2px */
  --border-radius-md: 0.25rem;    /* 4px */
  --border-radius-lg: 0.5rem;     /* 8px */
  --border-radius-xl: 0.75rem;    /* 12px */
  --border-radius-2xl: 1rem;      /* 16px */
  --border-radius-3xl: 1.5rem;    /* 24px */
  --border-radius-full: 9999px;

  /* 文字尺寸变量 */
  --font-size-xs: 0.75rem;        /* 12px */
  --font-size-sm: 0.875rem;       /* 14px */
  --font-size-base: 1rem;         /* 16px */
  --font-size-lg: 1.125rem;       /* 18px */
  --font-size-xl: 1.25rem;       /* 20px */
  --font-size-2xl: 1.5rem;        /* 24px */
  --font-size-3xl: 1.875rem;      /* 30px */
  --font-size-3xl: 1.875rem;      /* 30px */
  --font-size-4xl: 2.25rem;       /* 36px */
  --font-size-5xl: 3rem;          /* 48px */
  --font-size-6xl: 3.75rem;       /* 60px */
  --font-size-7xl: 4.5rem;        /* 72px */
  --font-size-8xl: 6rem;          /* 96px */
  --font-size-9xl: 8rem;          /* 128px */

  /* 行高变量 */
  --line-height-none: 1;
  --line-height-tight: 1.25;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  --line-height-loose: 2;

  /* 字母间距变量 */
  --letter-spacing-tighter: -0.05em;
  --letter-spacing-tight: -0.025em;
  --letter-spacing-normal: 0em;
  --letter-spacing-wide: 0.025em;
  --letter-spacing-wider: 0.05em;
  --letter-spacing-widest: 0.1em;

  /* 动画变量 */
  --animation-spin: spin 1s linear infinite;
  --animation-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  --animation-bounce: bounce 1s infinite;

  /* 过渡持续时间变量 */
  --transition-duration-fast: 150ms;
  --transition-duration-normal: 200ms;
  --transition-duration-slow: 300ms;

  /* zIndex 变量 */
  --z-index-dropdown: 1000;
  --z-index-sticky: 1100;
  --z-index-fixed: 1200;
  --z-index-modal-backdrop: 1300;
  --z-index-modal: 1400;
  --z-index-popover: 1500;
  --z-index-tooltip: 1600;

  /* 阴影变量 */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

  /* 高度和宽度变量 */
  --height-screen: 100vh;
  --width-screen: 100vw;
  --max-width-xs: 20rem;          /* 320px */
  --max-width-sm: 24rem;          /* 384px */
  --max-width-md: 28rem;          /* 448px */
  --max-width-lg: 32rem;          /* 512px */
  --max-width-xl: 36rem;          /* 576px */
  --max-width-2xl: 42rem;         /* 672px */
  --max-width-3xl: 48rem;         /* 768px */
  --max-width-4xl: 56rem;         /* 896px */
  --max-width-5xl: 64rem;         /* 1024px */
  --max-width-6xl: 72rem;         /* 1152px */
  --max-width-7xl: 80rem;         /* 1280px */

  /* 颜色变量 */
  --color-white: #ffffff;
  --color-black: #000000;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;

  /* InputArea 组件的阴影和边框变量 */
  --input-wrapper-shadow: 0 2px 4px 0px #00000005, 0px 4px 16px 0px #0000000a, 0px 8px 32px 0px #00000014;
  --input-wrapper-active-shadow: 0 2px 4px 0 rgba(116, 158, 243, 0.02), 0 4px 12px 0 rgba(102, 188, 253, 0.04), 0 8px 24px 0 rgba(95, 178, 255, 0.17);
  --input-wrapper-border-color: rgba(0, 0, 0, 0.12);
  --input-wrapper-focus-border-color: rgba(178, 209, 255, 1);
  --input-wrapper-inset-shadow: 0 0 #0000;
  --input-wrapper-inset-ring-shadow: 0 0 #0000;
  --input-wrapper-ring-offset-shadow: 0 0 #0000;
  --input-wrapper-ring-shadow: 0 0 #0000;
  
  /* 推理按钮相关颜色变量 */
  --reasoning-button-active-bg: #3b82f6;
  --reasoning-button-active-text: #ffffff;
  --reasoning-button-active-hover-bg: #2563eb;
}

.dark {
  /* 深色模式变量 */
  --input-container-border-color: #374151;
  --input-placeholder-color: #9ca3af; /* dark:text-muted-foreground */
  --input-bg-color: 255, 255, 255; /* bg-input in dark mode */
  --input-bg-opacity: 0.1; /* bg-input/30 in dark mode */
  --reasoning-button-active-bg: #1d4ed8;
  --reasoning-button-active-hover-bg: #1e40af;
}

html,
body {
  width: 100dvw;
  height: 100dvh;
}
</style>