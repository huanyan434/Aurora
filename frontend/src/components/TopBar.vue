<template>
  <div class="topbar-container">
    <!-- 折叠按钮 -->
    <Button v-if="sidebarStore.collapsed" variant="ghost" size="icon" class="toggle-btn" @click="toggleSidebar">
      <svg xmlns="http://www.w3.org/2000/svg" class="toggle-btn-icon" fill="currentColor" viewBox="0 0 24 24">
        <path fill-rule="evenodd"
          d="M21 5H11v14h10zM3 5h6v14H3zm0-2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm2 4.25a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5zm-.75 3.5A.75.75 0 0 1 5 10h2a.75.75 0 0 1 0 1.5H5a.75.75 0 0 1-.75-.75m.75 2a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5z"
          clip-rule="evenodd"></path>
      </svg>
    </Button>

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
          <DropdownMenuItem @click="goToProfile" class="profile-menu-item">
            <span>个人资料</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="openSettingsDialog" class="settings-menu-item">
            <span>设置</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleLogout" class="logout-menu-item">
            <span class="logout-text">退出登录</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
import { useSidebarStore } from '@/stores/sidebar';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import { getInitial } from '@/lib/utils';
import { logout } from '@/api/user';
import ModelSelector from './ModelSelector.vue';

const router = useRouter();
const sidebarStore = useSidebarStore();
const userStore = useUserStore();

// 定义 emit
const emit = defineEmits(['open-settings']);

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
  emit('open-settings');
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
</script>

<style scoped>
.topbar-container {
  display: flex;
  align-items: center;
  padding-left: var(--spacing-lg);
  /* px-6 */
  padding-right: var(--spacing-lg);
  /* px-6 */
  padding-top: var(--spacing-md);
  /* py-4 */
  padding-bottom: var(--spacing-md);
  /* py-4 */
  background-color: #ffffff;
  /* 与主内容区域一致的白色背景 */
}

.dark .topbar-container {
  background-color: #0f0f0f;
  /* 深色模式下的背景，与聊天界面背景一致 */
}

.toggle-btn {
  padding: var(--spacing-xs);
  /* p-1 */
  border-radius: var(--border-radius-md);
  /* rounded-md */
  margin-right: var(--spacing-sm);
  /* mr-3 */
  color: var(--color-gray-600);
  /* text-gray-600 */
  cursor: pointer;
}

.toggle-btn:hover {
  background-color: var(--color-gray-100);
  /* hover:bg-gray-100 - 与新背景协调 */
}

.dark .toggle-btn:hover {
  background-color: #262626;
  /* dark:hover:bg-gray-800 */
}

.dark .toggle-btn {
  color: #a3a3a3;
  /* dark:text-gray-400 */
}

.toggle-btn-icon {
  height: var(--spacing-lg);
  /* h-5 */
  width: var(--spacing-lg);
  /* w-5 */
}

.user-menu-container {
  display: flex;
  align-items: center;
  margin-left: auto;
  /* ml-auto */
}

.user-avatar-btn {
  position: relative;
  height: var(--button-size);
  /* h-8 */
  width: var(--button-size);
  /* w-8 */
  border-radius: var(--border-radius-full);
  /* rounded-full */
}

.user-avatar {
  height: var(--button-size);
  /* h-8 */
  width: var(--button-size);
  /* w-8 */
}

.user-dropdown-content {
  width: 14rem;
  /* w-56 */
  background-color: #0f0f0f;
  /* 深色模式下拉菜单背景 */
  border-color: #404040;
  /* 深色模式下拉菜单边框 */
}

.dark .user-dropdown-content {
  background-color: #0f0f0f;
  border-color: #404040;
}

.profile-menu-item {
  cursor: pointer;
  color: #1f2937;
  /* 浅色模式下深色文字 */
}

.dark .profile-menu-item {
  color: #f5f5f5;
  /* 深色模式下浅色文字 */
}

.settings-menu-item {
  cursor: pointer;
  color: #1f2937;
  /* 浅色模式下深色文字 */
}

.dark .settings-menu-item {
  color: #f5f5f5;
  /* 深色模式下浅色文字 */
}

.logout-menu-item {
  cursor: pointer;
  color: #dc2626;
  /* text-red-600 */
}

.dark .logout-menu-item {
  color: #f87171;
  /* dark:text-red-400 */
}

.logout-text {
  color: #dc2626;
  /* group:text-red-600 */
}

[data-highlighted] .logout-text {
  color: #dc2626;
  /* group-data-[highlighted]:text-red-600 */
}

.dark [data-highlighted] .logout-text {
  color: #f87171;
  /* dark:group-data-[highlighted]:text-red-400 */
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
</style>