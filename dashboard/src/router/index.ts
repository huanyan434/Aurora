import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'
import api from '@/api'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'overview',
        name: 'Overview',
        component: () => import('@/views/Overview.vue')
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue')
      },
      {
        path: 'points',
        name: 'Points',
        component: () => import('@/views/Points.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth) {
    // 检查本地是否有用户信息
    if (userStore.isLoggedIn) {
      next()
      return
    }

    // 本地没有用户信息，尝试通过 API 检查后端 session
    try {
      const response = await api.get('/dashboard/overview')
      if (response.data.success) {
        // 后端 session 有效，设置用户信息
        userStore.setUser({
          id: '1',
          username: 'Admin',
          email: 'admin@aurora.com',
          isMember: true,
          memberLevel: 'SVIP',
          points: 999999
        })
        next()
      } else {
        next('/login')
      }
    } catch (error) {
      // API 调用失败（401 或其他错误），跳转到登录页
      next('/login')
    }
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/dashboard/overview')
  } else {
    next()
  }
})

export default router
