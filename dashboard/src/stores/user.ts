import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const isLoggedIn = ref(false)

  function setUser(user: User | null) {
    currentUser.value = user
    isLoggedIn.value = !!user
  }

  function clearUser() {
    currentUser.value = null
    isLoggedIn.value = false
  }

  return {
    currentUser,
    isLoggedIn,
    setUser,
    clearUser
  }
})
