import { createRouter, createWebHistory } from "vue-router"
import { useUserStore } from "@/stores/user.ts"

// 路由配置
const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/views/Chat.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/c/:conversationId?",
    name: "Chat",
    component: () => import("@/views/Chat.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/Login.vue"),
    meta: { requiresGuest: true },
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("@/views/Register.vue"),
    meta: { requiresGuest: true },
  },
  {
    path: "/profile",
    name: "Profile",
    component: () => import("@/views/Profile.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/share/:shareId",
    name: "Share",
    component: () => import("@/views/Share.vue"),
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // 初始化用户状态
  if (!userStore.checkAuthenticated()) {
    console.log("初始化用户状态")
    await userStore.init()
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest)

  if (requiresAuth && !userStore.checkAuthenticated()) {
    // 需要认证但未登录，跳转到登录页
    console.log("跳转到登录页")
    next({ name: "Login", query: { redirect: to.fullPath } })
  } else if (requiresGuest && userStore.checkAuthenticated()) {
    if (from) {
      console.log("跳转到上一页")
      next(from)
    } else {
      console.log("跳转到首页")
      next({ name: "Home" })
    }
  } else {
    next()
  }
})

export default router
