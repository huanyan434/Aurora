import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { getCurrentUser } from '@/api/user'
import type { CurrentUserResponseSuccess } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const userInfo = reactive({
    id: '',
    email: '',
    username: '',
    isMember: false,
    memberLevel: '',
    points: 0
  })
  const isAuthenticated = ref(false)

  const init = async () => {
    try {
      const response = await getCurrentUser()

      if (response.data.success) {
        const data = response.data as CurrentUserResponseSuccess
        userInfo.id = data.id
        userInfo.email = data.email
        userInfo.username = data.username
        userInfo.isMember = data.isMember
        userInfo.memberLevel = data.memberLevel
        userInfo.points = data.points

        // 检查是否有任何字段为空，如果有重置字段
        if (!userInfo.id || !userInfo.email || !userInfo.username) {
          logout()
        } else {
          isAuthenticated.value = true
        }
      } else {
        isAuthenticated.value = false
      }
    } catch (error: any) {
      // 当返回400状态码时，表示用户未登录，这是正常情况
      if (error.message && error.message.includes('HTTP error! status: 400')) {
        console.log('用户未登录')
      } else {
        console.error('获取用户信息失败:', error)
      }
      isAuthenticated.value = false
    }
  }

  const logout = () => {
    userInfo.id = ''
    userInfo.email = ''
    userInfo.username = ''
    userInfo.isMember = false
    userInfo.memberLevel = ''
    userInfo.points = 0
    isAuthenticated.value = false
  }

  const checkAuthenticated = () => {
    init()
    if (!userInfo.id || !userInfo.email || !userInfo.username || !isAuthenticated.value) {
      logout()
      return false
    }

    return true
  }

  return {
    userInfo,
    isAuthenticated,
    init,
    logout,
    checkAuthenticated
  }
}, {
  //持久化存储到
  persist: true
})