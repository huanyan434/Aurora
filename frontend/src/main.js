import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 导入 Naive UI
import naive from 'naive-ui'

/**
 * 创建并配置Vue应用实例
 */
const app = createApp(App)

// 使用Pinia状态管理
app.use(createPinia())

// 使用Vue Router
app.use(router)

// 使用 Naive UI
app.use(naive)

// 挂载应用
app.mount('#app')