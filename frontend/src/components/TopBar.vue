<template>
  <div class="topbar-container">
    <!-- 折叠按钮 -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            v-if="sidebarStore.collapsed"
            variant="ghost"
            size="icon"
            class="toggle-btn"
            @click="toggleSidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="toggle-btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>展开侧边栏</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- 模型选择器 -->
    <ModelSelector />

    <!-- 用户头像下拉菜单 -->
    <div class="user-menu-container">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" class="user-avatar-btn">
            <Avatar class="user-avatar">
              <AvatarImage src="/avatars/user.jpg" alt="@user" />
              <AvatarFallback>{{ userInitial || 'U' }}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="user-dropdown-content" align="end">
          <DropdownMenuItem @click="goToProfile">
            <span>个人资料</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="openSettingsDialog">
            <span>设置</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="logout-menu-item" @click="handleLogout">
            <span class="logout-text">退出登录</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
            <Switch v-model:checked="darkMode" />
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
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { useSidebarStore } from '@/stores/sidebar';
import { useUserStore } from '@/stores/user';
import { useSettingsStore } from '@/stores/settings';
import { useRouter } from 'vue-router';
import { computed, ref, onMounted } from 'vue';
import { getInitial } from '@/lib/utils';
import { logout } from '@/api/user';
import ModelSelector from './ModelSelector.vue';

const router = useRouter();
const sidebarStore = useSidebarStore();
const userStore = useUserStore();
const settingsStore = useSettingsStore();

// 设置对话框状态
const isSettingsDialogOpen = ref(false);
// 设置选项状态
const darkMode = ref(false);
const notifications = ref(true);

// 应用深色模式到整个应用
const applyDarkMode = (enabled: boolean) => {
  if (enabled) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// 直接调用store方法来切换侧边栏状态
const toggleSidebar = () => {
  sidebarStore.toggleSidebar();
};

// 跳转到个人资料页面
const goToProfile = () => {
  router.push('/profile');
};

// 打开设置对话框
const openSettingsDialog = () => {
  // 初始化设置选项
  darkMode.value = settingsStore.getSetting('darkMode');
  isSettingsDialogOpen.value = true;
};

// 关闭设置对话框
const closeSettingsDialog = () => {
  isSettingsDialogOpen.value = false;
};

// 保存设置
const saveSettings = () => {
  // 保存到设置 store
  settingsStore.setSetting('darkMode', darkMode.value);
  settingsStore.setSetting('notifications', notifications.value);

  // 应用深色模式到整个应用
  applyDarkMode(darkMode.value);

  closeSettingsDialog();
};

// 获取用户昵称首字母
const userInitial = computed(() => {
  return getInitial(userStore.userInfo.username);
});

// 处理退出登录
const handleLogout = async () => {
  try {
    // 调用退出登录 API
    await logout();
    
    // 清除用户信息
    userStore.logout();
    
    // 跳转到登录页
    router.push('/login');
  } catch (error) {
    console.error('退出登录失败:', error);
  }
};

// 在组件挂载时应用深色模式设置
onMounted(() => {
  // 从设置 store 获取深色模式设置并应用
  const darkModeSetting = settingsStore.getSetting('darkMode');
  applyDarkMode(darkModeSetting);
});
</script>

<style scoped>
.topbar-container {
  display: flex;
  align-items: center;
  padding-left: var(--spacing-lg); /* px-6 */
  padding-right: var(--spacing-lg); /* px-6 */
  padding-top: var(--spacing-md); /* py-4 */
  padding-bottom: var(--spacing-md); /* py-4 */
}

.toggle-btn {
  padding: var(--spacing-xs); /* p-1 */
  border-radius: var(--border-radius-md); /* rounded-md */
  margin-right: var(--spacing-sm); /* mr-3 */
  color: var(--color-gray-600); /* text-gray-700 */
}

.toggle-btn:hover {
  background-color: var(--color-gray-200); /* hover:bg-gray-200 */
}

.dark .toggle-btn:hover {
  background-color: var(--color-gray-700); /* dark:hover:bg-gray-700 */
}

.dark .toggle-btn {
  color: var(--color-gray-300); /* dark:text-gray-300 */
}

.toggle-btn-icon {
  height: var(--spacing-lg); /* h-5 */
  width: var(--spacing-lg); /* w-5 */
}

.user-menu-container {
  display: flex;
  align-items: center;
  margin-left: auto; /* ml-auto */
}

.user-avatar-btn {
  position: relative;
  height: var(--button-size); /* h-8 */
  width: var(--button-size); /* w-8 */
  border-radius: var(--border-radius-full); /* rounded-full */
}

.user-avatar {
  height: var(--button-size); /* h-8 */
  width: var(--button-size); /* w-8 */
}

.user-dropdown-content {
  width: 14rem; /* w-56 */
}

.logout-menu-item {
  color: #dc2626; /* text-red-600 */
}

.dark .logout-menu-item {
  color: #f87171; /* dark:text-red-400 */
}

.logout-text {
  color: #dc2626; /* group:text-red-600 */
}

[data-highlighted] .logout-text {
  color: #dc2626; /* group-data-[highlighted]:text-red-600 */
}

.dark [data-highlighted] .logout-text {
  color: #f87171; /* dark:group-data-[highlighted]:text-red-400 */
}

.settings-dialog-content {
  max-width: 21rem; /* sm:max-w-md */
}

.settings-dialog-body {
  padding-top: 1rem; /* py-4 */
  padding-bottom: 1rem; /* py-4 */
  display: flex;
  flex-direction: column;
  gap: 1rem; /* space-y-4 */
}

.dark-mode-setting {
  display: flex;
  align-items: center;
  justify-content: space-between; /* justify-between */
}

.setting-label {
  display: flex;
  align-items: center; /* items-center */
}
</style>