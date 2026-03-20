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
          <img src="/favicon.png" alt="Aurora" class="logo-icon" />
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
        <div class="sidebar-quote">
          一切伟大的行动和思想，<br>都有一个微不足道的开始。
        </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const sidebarOpen = ref(false)
const isMobile = ref(false)

const showMobileMenu = computed(() => {
  return isMobile.value
})

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 1024
  if (!isMobile.value) {
    sidebarOpen.value = false
  }
}

const navItems = [
  { path: '/dashboard/overview', name: '数据概览', icon: '📊' },
  { path: '/dashboard/users', name: '用户管理', icon: '👥' },
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
  if (isMobile.value) {
    closeSidebar()
  }
}

const handleLogout = () => {
  userStore.clearUser()
  router.push('/login')
}

// 监听窗口大小变化
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
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
  width: 48px;
  height: 48px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  object-fit: cover;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: 20px;
  font-weight: 700;
  color: #18181b;
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
  background: #18181b;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #27272a;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
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
  background: #f4f4f5;
  color: var(--text-primary);
}

.nav-item-active {
  background: #18181b;
  color: white;
}

.nav-item-active:hover {
  background: #27272a;
  color: white;
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

.sidebar-quote {
  margin-bottom: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  font-size: 11px;
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.5;
  text-align: center;
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
