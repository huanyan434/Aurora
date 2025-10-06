import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user.js'

// 路由配置
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Chat.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/c/:conversationId?',
    name: 'Chat',
    component: () => import('@/views/Chat.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/share/:shareId',
    name: 'Share',
    component: () => import('@/views/Share.vue')
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * 路由守卫 - 处理用户认证和重定向
 */
router.beforeEach(async (to, from, next) => {
  console.log('路由守卫触发:', { from: from.path, to: to.path })
  
  const userStore = useUserStore()
  
  // 初始化用户状态
  if (!userStore.initialized) {
    console.log('初始化用户状态')
    await userStore.init()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
  
  console.log('路由权限检查:', { 
    requiresAuth, 
    requiresGuest, 
    isAuthenticated: userStore.isAuthenticated,
    userInfo: userStore.userInfo
  })

  if (requiresAuth && !userStore.isAuthenticated) {
    // 需要认证但未登录，跳转到登录页
    console.log('需要认证但未登录，跳转到登录页')
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (requiresGuest && userStore.isAuthenticated) {
    // 已登录用户访问登录/注册页，跳转到聊天页
    console.log('已登录用户访问登录/注册页，跳转到聊天页')
    next({ name: 'Home' })
  } else {
    console.log('正常跳转')
    next()
  }
})

export default router