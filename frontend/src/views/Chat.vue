<template>
  <div class="chat-container">
    <!-- 遮罩层，只在移动端且侧边栏展开时显示 -->
    <div v-if="isMobile && !sidebarStore.collapsed" class="overlay" @click="closeSidebarOnMobile"></div>

    <!-- 左侧侧边栏 -->
    <div class="sidebar-wrapper" :class="{ 'mobile-open': isMobile && !sidebarStore.collapsed }" :style="{
      width:
        sidebarStore.collapsed && !isMobile
          ? '0'
          : isMobile
            ? '80%'
            : '18rem',
      maxWidth: isMobile ? '20rem' : '18rem',
      transform: isMobile
        ? sidebarStore.collapsed
          ? 'translateX(-100%)'
          : 'translateX(0)'
        : 'none',
      position: isMobile ? 'fixed' : 'relative',
    }" style="overflow: hidden; z-index: 880">
      <div class="sidebar-content" :style="{
        opacity: sidebarStore.collapsed && !isMobile ? 0 : 1,
      }">
        <Sidebar :toggleSidebar="toggleSidebarForMobile" />
      </div>
    </div>

    <!-- 右侧主内容区域 -->
    <div class="main-content-wrapper" :class="{
      'main-content-collapsed': sidebarStore.collapsed && !isMobile,
    }">
      <MainContent @open-settings="openSettingsDialogFromChild" />
    </div>

    <!-- 设置对话框 -->
    <Dialog v-model:open="isSettingsDialogOpen">
      <DialogContent class="settings-dialog-content">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>
        <div class="settings-dialog-body">
          <div class="dark-mode-setting">
            <div class="setting-label">
              <span>深色模式</span>
            </div>
            <Switch v-model="darkMode" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="closeSettingsDialog">取消</Button>
          <Button type="button" @click="saveSettings">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useSidebarStore } from "@/stores/sidebar";
import { ref, onMounted } from "vue";
import Sidebar from "@/components/Sidebar.vue";
import MainContent from "@/components/MainContent.vue";
import { useSettingsStore } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

const sidebarStore = useSidebarStore();
const isMobile = ref(false);

// 设置对话框状态
const isSettingsDialogOpen = ref(false);
// 设置选项状态
const darkMode = ref(false);
const notifications = ref(true);
const settingsStore = useSettingsStore();

// 检测屏幕尺寸并设置isMobile标志
const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 1135;
};

// 初始化
onMounted(() => {
  checkScreenSize();
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

// 应用深色模式到整个应用
const applyDarkMode = (enabled: boolean) => {
  if (enabled) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// 关闭设置对话框
const closeSettingsDialog = () => {
  isSettingsDialogOpen.value = false;
};

// 保存设置
const saveSettings = () => {
  console.log(`darkMode:` + darkMode.value);
  // 保存到设置 store
  settingsStore.setSetting('darkMode', darkMode.value);
  settingsStore.setSetting('notifications', notifications.value);

  // 应用深色模式到整个应用
  applyDarkMode(darkMode.value);
  closeSettingsDialog();
};

// 打开设置对话框（从子组件触发）
const openSettingsDialogFromChild = () => {
  // 初始化设置选项
  darkMode.value = settingsStore.getSetting('darkMode');
  isSettingsDialogOpen.value = true;
};

// 在组件挂载时应用深色模式设置
onMounted(() => {
  // 从设置 store 获取深色模式设置并应用
  const darkModeSetting = settingsStore.getSetting('darkMode');
  applyDarkMode(darkModeSetting);
});
</script>

<style>
.chat-container {
  display: flex;
  height: var(--height-screen);
  /* h-screen */
  background-color: var(--color-white);
  /* bg-white */
  color: var(--color-gray-900);
  /* text-gray-900 */
}

.dark .chat-container {
  background-color: var(--color-black);
  /* dark:bg-black */
  color: var(--color-gray-100);
  /* dark:text-gray-100 */
}

.sidebar-wrapper {
  height: 100%;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: var(--transition-duration-slow);
  /* duration-300 */
  display: flex;
  min-width: 0;
  /* 允许收缩 */
}

.main-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: margin-left var(--transition-duration-slow) ease-in-out;
}

.main-content-collapsed {
  margin-left: 0;
  /* ml-0 */
}

.more-options-dropdown {
  width: 8rem;
  /* w-32 */
  z-index: var(--z-index-dropdown);
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 879;
  transition: opacity var(--transition-duration-slow) ease-in-out;
}

/* 移动端样式 */
@media (max-width: 1135px) {
  .sidebar-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 999;
    transform: translateX(-100%);
    width: 80% !important;
    /* 移动端侧边栏宽度 */
    max-width: 20rem;
    /* 最大宽度限制 */
  }

  .sidebar-wrapper.mobile-open {
    transform: translateX(0);
  }

  .main-content-wrapper {
    position: relative;
    z-index: 10;
  }
}

/* 设置对话框样式 */
.settings-dialog-content {
  min-width: 30rem;
  z-index: var(--z-index-dialog) !important;
}

.settings-dialog-body {
  padding-top: 1rem;
  /* py-4 */
  padding-bottom: 1rem;
  /* py-4 */
  display: flex;
  flex-direction: column;
  gap: 1rem;
  /* space-y-4 */
}

.dark-mode-setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* justify-between */
}

.setting-label {
  display: flex;
  align-items: center;
  /* items-center */
}

/* 修复Dialog遮罩层和内容的z-index */
[data-slot="dialog-overlay"] {
  z-index: calc(var(--z-index-dialog) - 1) !important;
}

[data-slot="dialog-content"] {
  z-index: var(--z-index-dialog) !important;
}
</style>
