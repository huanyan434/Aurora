<template>
  <div id="app">
    <!-- 全局配置提供者 -->
    <n-config-provider :theme="theme" :locale="zhCN" :date-locale="dateZhCN">
      <n-global-style />
      <n-message-provider>
        <n-dialog-provider>
          <n-notification-provider>
            <router-view />
          </n-notification-provider>
        </n-dialog-provider>
      </n-message-provider>
    </n-config-provider>
  </div>
</template>

<script>
import { ref } from 'vue'
import { 
  NConfigProvider, 
  NMessageProvider, 
  NDialogProvider, 
  NNotificationProvider,
  NGlobalStyle,
  zhCN,
  dateZhCN
} from 'naive-ui'

export default {
  name: 'App',
  components: {
    NConfigProvider,
    NMessageProvider,
    NDialogProvider,
    NNotificationProvider,
    NGlobalStyle
  },
  setup() {
    // 主题配置
    const theme = ref(null) // null表示浅色主题

    return {
      theme,
      zhCN,
      dateZhCN
    }
  }
}
</script>

<style>
#app {
  width: 100dvh;
  height: 100dvh;
  overflow: hidden;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f5f5;
}
</style>
