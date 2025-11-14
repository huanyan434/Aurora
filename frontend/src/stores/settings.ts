import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Settings {
  darkMode: boolean
  // 以后可以扩展其他设置
  [key: string]: any
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({
    darkMode: false // 默认为浅色模式
  })

  const setSetting = (key: string, value: any) => {
    settings.value[key] = value
  }

  const getSetting = (key: string) => {
    return settings.value[key]
  }

  const initializeSettings = (initialSettings: Settings) => {
    settings.value = { ...settings.value, ...initialSettings }
  }

  return {
    settings,
    setSetting,
    getSetting,
    initializeSettings
  }
}, {
  persist: true // 启用持久化存储
})