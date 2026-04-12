import { createApp } from 'vue'
import '@/style.css'
import 'katex/dist/katex.min.css'
import App from '@/App.vue'
import router from '@/router'

import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

// 初始化 toast 功能
import { initToast } from '@/components/ui/toast/use-toast'

// 导入设置 store
import { useSettingsStore } from '@/stores/settings'

// 覆盖 ds-markdown 深色模式背景
const dsMarkdownDarkStyle = document.createElement('style')
dsMarkdownDarkStyle.textContent = `
.ds-markdown.ds-markdown-dark {
  --dsr-bg: #0f0f0f !important;
}
`
document.head.appendChild(dsMarkdownDarkStyle)

const app = createApp(App)

const pinia = createPinia().use(piniaPluginPersistedstate)
app.use(pinia)

app.use(router)

// 在应用挂载前应用深色模式设置
const settingsStore = useSettingsStore(pinia)
const darkModeSetting = settingsStore.getSetting('darkMode')

// 应用深色模式到整个应用
if (darkModeSetting) {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

app.mount('#app')

// 初始化 toast 容器
initToast()
