<template>
  <div class="dashboard-container">
    <!-- 顶部导航栏 -->
    <header class="dashboard-header">
      <div class="header-left">
        <button class="menu-toggle" @click="toggleSidebar" v-if="showMobileMenu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div class="logo">
          <span class="logo-icon">🌅</span>
          <div class="logo-text">
            <span class="logo-title">Aurora</span>
            <span class="logo-subtitle">管理控制台</span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <button class="logout-btn" @click="handleLogout">
          <span>退出登录</span>
        </button>
      </div>
    </header>

    <!-- 侧边栏遮罩 -->
    <div class="sidebar-overlay" v-if="sidebarOpen" @click="closeSidebar"></div>

    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ 'nav-item-active': isActive(item.path) }"
          @click="onNavClick"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.name }}</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <div class="version-info">
          <span>Aurora Dashboard</span>
          <span class="version">v1.0.0</span>
        </div>
      </div>
    </aside>

    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const sidebarOpen = ref(false)

const showMobileMenu = computed(() => {
  return window.innerWidth <= 1024
})

const navItems = [
  { path: '/dashboard/overview', name: '数据概览', icon: '📊' },
  { path: '/dashboard/users', name: '用户管理', icon: '👥' },
  { path: '/dashboard/conversations', name: '对话管理', icon: '💬' },
  { path: '/dashboard/points', name: '积分统计', icon: '💰' }
]

const isActive = (path: string) => route.path === path

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebar = () => {
  sidebarOpen.value = false
}

const onNavClick = () => {
  if (window.innerWidth <= 1024) {
    closeSidebar()
  }
}

const handleLogout = () => {
  userStore.clearUser()
  router.push('/login')
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: var(--bg-color);
}

/* 顶部导航栏 */
.dashboard-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height);
  background: white;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.menu-toggle span {
  width: 24px;
  height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
  transition: all 0.3s;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logout-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.logout-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
}

/* 侧边栏 */
.sidebar {
  position: fixed;
  top: var(--header-height);
  left: 0;
  width: var(--sidebar-width);
  height: calc(100vh - var(--header-height));
  background: white;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  z-index: 99;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 12px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 8px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #f8fafc;
  color: var(--primary-color);
}

.nav-item-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.nav-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.version-info .version {
  color: var(--text-muted);
}

/* 侧边栏遮罩 */
.sidebar-overlay {
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 98;
  animation: fadeIn 0.3s;
}

/* 主内容区域 */
.main-content {
  margin-left: var(--sidebar-width);
  margin-top: var(--header-height);
  padding: 32px;
  min-height: calc(100vh - var(--header-height));
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .menu-toggle {
    display: flex;
  }

  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar-open {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }

  .dashboard-header {
    padding: 0 16px;
  }
}

@media (max-width: 640px) {
  .main-content {
    padding: 16px;
  }

  .logo-subtitle {
    display: none;
  }

  .logout-btn span {
    display: none;
  }

  .logout-btn::after {
    content: '🚪';
    font-size: 18px;
  }
}
</style>
