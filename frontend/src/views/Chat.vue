<template>
  <div class="chat-container">
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ 'collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <h2 v-if="!sidebarCollapsed">对话列表</h2>
        <n-button
          quaternary
          circle
          @click="toggleSidebar"
          class="toggle-btn"
        >
          <template #icon>
            <n-icon>
              <Menu />
            </n-icon>
          </template>
        </n-button>
      </div>
      
      <div class="sidebar-content">
        <n-button
          type="primary"
          block
          @click="createNewChat"
          class="new-chat-btn"
          v-if="!sidebarCollapsed"
        >
          <template #icon>
            <n-icon>
              <Plus />
            </n-icon>
          </template>
          新建对话
        </n-button>
        
        <n-button
          v-else
          type="primary"
          circle
          @click="createNewChat"
          class="new-chat-btn-collapsed"
        >
          <template #icon>
            <n-icon>
              <Plus />
            </n-icon>
          </template>
        </n-button>
        
        <div class="conversations-list">
          <ConversationItem
          v-for="conversation in conversations"
          :key="conversation.ID || conversation.ID || conversation"
          :conversation="conversation"
          :is-active="!!(currentConversationId && (currentConversationId === (conversation.ID || conversation.ID)))"
          @select="selectConversation"
          @rename="handleRenameConversation"
          @share="handleShareConversation"
        />
        </div>
      </div>
      
      <!-- 用户信息 -->
      <div class="sidebar-footer" v-if="!sidebarCollapsed">
        <div class="user-info" @click="goToProfile">
          <n-avatar
            :size="32"
            :src="userInfo?.avatar"
            :fallback-src="'/user-avatar.png'"
          >
            {{ userInfo?.username?.charAt(0).toUpperCase() || 'U' }}
          </n-avatar>
          <div class="user-details">
            <div class="username">{{ userInfo?.username || '用户' }}</div>
            <div class="user-points">积分: {{ userInfo?.points || 0 }}</div>
          </div>
        </div>
        
        <n-button
          quaternary
          circle
          size="small"
          @click="handleLogout"
          title="退出登录"
        >
          <template #icon>
            <n-icon>
              <Logout />
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <ChatArea 
        v-if="currentConversation || showWelcome" 
        :conversation="currentConversation"
      />
      
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-content">
          <h2>欢迎使用 Aurora AI</h2>
          <p>选择一个对话或创建新对话开始聊天</p>
          <n-button type="primary" @click="createNewChat">
            <template #icon>
              <n-icon>
                <Plus />
              </n-icon>
            </template>
            创建新对话
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  NButton, 
  NIcon, 
  NAvatar,
  useMessage,
  useDialog
} from 'naive-ui'
import { 
  Plus,
  Menu,
  Logout
} from '@vicons/tabler'

import ConversationItem from '@/components/ConversationItem.vue'
import ChatArea from '@/components/ChatArea.vue'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { chatApi } from '@/api/chat'

/**
 * 主聊天页面组件
 * 包含左侧对话列表和右侧聊天区域
 */

const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()
const chatStore = useChatStore()
const userStore = useUserStore()

// 响应式状态
const sidebarCollapsed = ref(false)
const isMobile = ref(window.innerWidth <= 768)

// 计算属性
const conversations = computed(() => chatStore.conversations)
const currentConversationId = computed(() => chatStore.currentConversationId)
const currentConversation = computed(() => chatStore.currentConversation)
const userInfo = computed(() => userStore.userInfo)
const showWelcome = computed(() => !currentConversation.value && conversations.value.length === 0)

/**
 * 切换侧边栏
 */
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

/**
 * 创建新对话
 */
const createNewChat = async () => {
  // 不再直接创建对话，而是跳转到/路由显示欢迎界面
  router.push('/')
  chatStore.setCurrentConversation(null)
}

/**
 * 选择对话
 */
const selectConversation = (conversation) => {
  console.log('选择对话:', conversation)
  chatStore.setCurrentConversation(conversation)
  // 检查对话对象的ID字段
  const conversationId = conversation?.ID;
  if (conversation && conversationId) {
    router.push(`/c/${conversationId}`)
  } else {
    router.push('/')
  }
  
  // 移动端自动收起侧边栏
  if (isMobile.value) {
    sidebarCollapsed.value = true
  }
}

/**
 * 处理重命名对话
 */
const handleRenameConversation = async (conversation) => {
  // 显示输入对话框
  const value = ref(conversation.title)
  
  dialog.info({
    title: '重命名对话',
    content: () => h('n-input', {
      value: value.value,
      onUpdateValue: (val) => {
        value.value = val
      },
      placeholder: '请输入新的对话名称'
    }),
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (!value.value.trim()) {
        message.error('对话名称不能为空')
        return false
      }
      
      try {
        // 这里应该调用API更新对话标题
        // 由于API文档中没有提供更新对话标题的接口，暂时只更新本地状态
        conversation.title = value.value.trim()
        message.success('对话重命名成功')
        return true
      } catch (error) {
        console.error('重命名对话失败:', error)
        message.error('重命名对话失败')
        return false
      }
    }
  })
}

/**
 * 处理分享对话
 */
const handleShareConversation = async (conversation) => {
  try {
    // 获取当前对话的所有消息ID
    const messageIds = chatStore.messages.map(msg => msg.id)
    
    // 调用分享API
    const response = await chatApi.shareMessages({ messageIDs: messageIds })
    
    if (response.success) {
      const shareUrl = `${window.location.origin}/share/${response.data.share_id}`
      await navigator.clipboard.writeText(shareUrl)
      message.success('分享链接已复制到剪贴板')
    } else {
      message.error(response.message || '分享失败')
    }
  } catch (error) {
    console.error('分享对话失败:', error)
    message.error('分享对话失败')
  }
}

/**
 * 跳转到个人中心
 */
const goToProfile = () => {
  router.push('/profile')
}

/**
 * 处理退出登录
 */
const handleLogout = () => {
  dialog.warning({
    title: '确认退出',
    content: '确定要退出登录吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      userStore.logout()
      chatStore.reset()
      router.push('/login')
      message.success('已退出登录')
    }
  })
}

/**
 * 处理窗口大小变化
 */
const handleResize = () => {
  const newIsMobile = window.innerWidth <= 768
  if (newIsMobile !== isMobile.value) {
    isMobile.value = newIsMobile
    if (!isMobile.value) {
      sidebarCollapsed.value = false
    } else {
      sidebarCollapsed.value = true
    }
  }
}

// 监听路由变化
watch(
  () => route.params.conversationId,
  async (conversationId) => {
    console.log('路由变化，对话ID:', conversationId)
    if (conversationId) {
      // 查找对话是否存在
      let conversation = chatStore.conversations.find(conv => conv.ID === conversationId)
      
      if (conversation) {
        chatStore.setCurrentConversation(conversation)
      } else {
        // 如果对话不存在，先尝试刷新对话列表
        console.log('对话不存在，尝试刷新对话列表')
        const response = await chatApi.getConversations()
        if (response.success) {
          chatStore.conversations = response.data?.conversations || []
          // 再次查找对话
          let refreshedConversation = chatStore.conversations.find(conv => conv.ID === conversationId)
          
          if (refreshedConversation) {
            chatStore.setCurrentConversation(refreshedConversation)
          } else {
            // 如果还是不存在，跳转到首页
            console.log('对话仍然不存在，跳转到首页')
            router.push('/')
          }
        } else {
          // 获取对话列表失败，跳转到首页
          console.log('获取对话列表失败，跳转到首页')
          router.push('/')
        }
      }
    } else {
      console.log('无对话ID，清空当前对话')
      chatStore.setCurrentConversation(null)
    }
  },
  { immediate: true }
)

// 组件挂载时加载数据
onMounted(async () => {
  console.log('聊天页面挂载，开始加载数据')
  // 获取对话列表
  try {
    const response = await chatApi.getConversations()
    console.log('获取对话列表响应:', response)
    
    if (response.success) {
      chatStore.conversations = response.data?.conversations || []
    } else {
      message.error(response.message || '获取对话列表失败')
    }
    
    // 获取模型列表
    await chatStore.fetchModels()
  } catch (error) {
    console.error('获取数据失败:', error)
    message.error('获取数据失败')
  }
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
  handleResize()
})

// 组件卸载
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background-color: #f5f5f5;
}

.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;
  z-index: 100;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.toggle-btn {
  margin-left: auto;
}

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.new-chat-btn {
  margin: 16px;
  margin-bottom: 8px;
}

.new-chat-btn-collapsed {
  margin: 16px auto;
  margin-bottom: 8px;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
  flex: 1;
}

.user-info:hover {
  background-color: #f5f5f5;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-points {
  font-size: 12px;
  color: #666;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
}

.empty-content {
  text-align: center;
  padding: 40px;
}

.empty-content h2 {
  font-size: 24px;
  color: #333;
  margin-bottom: 12px;
}

.empty-content p {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidebar:not(.collapsed) {
    transform: translateX(0);
  }

  .chat-area {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .sidebar {
    width: 100vw;
  }
  
  .sidebar.collapsed {
    width: 60px;
  }
}
</style>