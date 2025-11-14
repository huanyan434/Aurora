<template>
  <div class="chat-container">
    <!-- 遮罩层 -->
    <div 
      class="sidebar-overlay" 
      v-if="isMobile && !sidebarCollapsed" 
      @click="toggleSidebar"
    ></div>
    
    <!-- 左侧侧边栏 -->
    <div class="sidebar" :class="{ 'collapsed': sidebarCollapsed, 'mobile-expanded': isMobile && !sidebarCollapsed, 'mobile-collapsed': isMobile && sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="sidebar-title-section">
          <h2 v-if="sidebarWidth >= 180 && !sidebarCollapsed" class="sidebar-title">Aurora AI</h2>
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
          开启新话题
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
      </div>
      
      <div class="conversations-list" v-if="!sidebarCollapsed">
        <!-- 骨架屏 -->
        <div v-if="showConversationsSkeleton" class="conversations-skeleton">
          <div class="skeleton-item" v-for="i in 5" :key="i">
            <n-skeleton width="100%" height="30px" style="margin-bottom: 8px;" />
          </div>
        </div>
        
        <div 
          v-for="conversation in conversations" 
          :key="conversation.ID"
          class="conversation-item-wrapper"
          :class="{ 'active': currentConversationId === conversation.ID }"
          @click="selectConversation(conversation)"
        >
          <div class="conversation-item">
            <!-- 重命名输入框 -->
            <div v-if="renamingConversationId === conversation.ID" class="rename-input-container">
              <n-input 
                ref="renameInputRef"
                v-model:value="renamingTitle"
                size="small"
                autofocus
                @keydown="handleRenameKeydown(conversation)"
              />
              <div class="rename-actions">
                <n-button text @click="saveRename(conversation)">
                  <n-icon size="16">
                    <Check />
                  </n-icon>
                </n-button>
                <n-button text @click="cancelRename">
                  <n-icon size="16">
                    <X />
                  </n-icon>
                </n-button>
              </div>
            </div>
            
            <!-- 普通标题显示 -->
            <n-tooltip v-else trigger="hover" :disabled="!isTitleOverflow(conversation.Title || '新对话')">
              <template #trigger>
                <div class="conversation-title" ref="conversationTitleRefs" :data-id="conversation.ID">
                  {{ conversation.Title || '新对话' }}
                </div>
              </template>
              <span>{{ conversation.Title || '新对话' }}</span>
            </n-tooltip>
          </div>
          
          <!-- 对话项的更多操作按钮 -->
          <div v-if="renamingConversationId !== conversation.ID" class="conversation-actions" @click.stop>
            <n-dropdown
              :options="getDropdownOptions(conversation)"
              @select="(key) => handleConversationAction(key, conversation)"
              trigger="click"
              placement="bottom-end"
            >
              <n-button
                quaternary
                circle
                size="small"
                class="action-btn"
              >
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-icon>
                      <DotsVertical />
                    </n-icon>
                  </template>
                  <span>更多操作</span>
                </n-tooltip>
              </n-button>
            </n-dropdown>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 移动端顶部按钮 -->
    <div class="mobile-top-buttons" v-if="isMobile">
      <div class="mobile-buttons-container">
        <n-button
          quaternary
          circle
          @click="toggleSidebar"
          class="mobile-toggle-btn"
        >
          <template #icon>
            <n-icon>
              <Menu />
            </n-icon>
          </template>
        </n-button>
        
        <n-button
          type="primary"
          circle
          @click="createNewChat"
          class="mobile-new-chat-btn"
        >
          <template #icon>
            <n-icon>
              <Plus />
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- 右侧主内容区域 -->
    <div class="main-content">
      <!-- 模型选择 -->
      <ModelSelector 
        v-if="!showSharePanel && !currentConversation"
        v-model:show-model-dropdown="showWelcomeModelDropdown"
      />
      <ChatArea 
        v-show="!showSharePanel && currentConversation" 
        :conversation="currentConversation"
        @share="handleShareMessage"
      />
      <!-- 空状态 - 新设计的欢迎界面 -->
      <div v-show="!showSharePanel && !currentConversation" class="welcome-state">
        <div class="welcome-content">
          <h2 class="welcome-text">{{ welcomeMessage }}</h2>
        </div>

        <!-- 欢迎界面的输入区域 -->
        <ChatInput
          :is-generating="isGenerating"
          :is-reasoning="isReasoningActive"
          :is-reasoning-disabled="isReasoningDisabled"
          :show-reasoning-button="showReasoningButton"
          @send-message="handleWelcomeSendMessage"
          @stop-generation="handleStopGeneration"
          @toggle-reasoning="toggleReasoning"
          @file-upload="handleFileUpload"
        />
      </div>
      
      <!-- 分享面板 -->
      <SharePanel 
        v-show="showSharePanel"
        @close="handleCloseSharePanel"
        @shared="handleShareSuccess"
      />
      
      <!-- 顶部导航栏 -->
      <div class="top-navbar">
        <div class="navbar-right">
          <n-dropdown
            :options="userDropdownOptions"
            @select="handleUserDropdownSelect"
            trigger="click"
            placement="bottom-end"
          >
            <n-avatar
              :size="40"
              :src="userInfo?.avatar"
              :fallback-src="'/user-avatar.png'"
              class="user-avatar"
              round
            >
              {{ userInfo?.username?.charAt(0).toUpperCase() || 'U' }}
            </n-avatar>
          </n-dropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, h, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  NButton, 
  NIcon, 
  NAvatar,
  NDropdown,
  NTooltip,
  useMessage,
  useDialog,
  NSkeleton
} from 'naive-ui'
import { 
  Plus,
  Menu,
  DotsVertical,
  Edit,
  Share as ShareIcon,
  Trash,
  User,
  Logout,
  Check,
  X
} from '@vicons/tabler'

import ChatArea from '@/components/ChatArea.vue'
import ChatInput from '@/components/ChatInput.vue'
import SharePanel from '@/components/SharePanel.vue'
import ModelSelector from '@/components/ModelSelector.vue'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { chatApi } from '@/api/chat'
import { generateSnowflakeId } from '@/utils/snowflake'

/**
 * 主聊天页面组件
 * 包含左侧侧边栏和右侧主内容区域
 */

const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()
const chatStore = useChatStore()
const userStore = useUserStore()
const renameInputRef = ref(null)

// 点击外部指令
const vClickOutside = {
  beforeMount(el, binding) {
    el.clickOutsideEvent = function(event) {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.body.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.clickOutsideEvent)
  }
}

// 响应式状态
const sidebarCollapsed = ref(true) // 默认折叠
const isMobile = ref(window.innerWidth <= 768)
const showSharePanel = ref(false)
const welcomeInputMessage = ref('')
const welcomeInputRef = ref(null)
const conversationTitleRefs = ref([])
const sidebarWidth = ref(280)
const isReasoning = ref(false)
const showConversationsSkeleton = ref(true)
const isGenerating = ref(false)
const showWelcomeModelDropdown = ref(false)
const renamingConversationId = ref(null) // 正在重命名的对话ID
const renamingTitle = ref('') // 正在重命名的标题

// 计算属性
const conversations = computed(() => chatStore.conversations)
const currentConversationId = computed(() => chatStore.currentConversationId)
const currentConversation = computed(() => chatStore.currentConversation)
const userInfo = computed(() => userStore.userInfo)
const currentModel = computed(() => {
  return chatStore.models.find(model => model.id === chatStore.selectedModel)
})

// 模型选项
const models = computed(() => chatStore.models)

// 选中的模型名称
const selectedModelName = computed(() => {
  const model = chatStore.models.find(m => m.id === chatStore.selectedModel)
  return model ? model.name : '选择模型'
})

// 是否显示推理按钮
const showReasoningButton = computed(() => {
  // 如果没有当前模型，显示按钮
  if (!currentModel.value) return true
  
  // 如果模型的 reasoning 字段为空，表示不支持推理，隐藏按钮
  return currentModel.value.reasoning !== ''
})

// 推理按钮是否禁用
const isReasoningDisabled = computed(() => {
  // 如果没有当前模型，不禁用
  if (!currentModel.value) return false
  
  // 如果模型的 reasoning 字段等于模型 ID，表示只支持推理，禁用按钮
  return currentModel.value.reasoning === currentModel.value.id
})

// 推理按钮是否激活
const isReasoningActive = computed(() => {
  // 如果没有当前模型，不激活
  if (!currentModel.value) return false
  
  // 如果模型的 reasoning 字段等于模型 ID，表示只支持推理，激活按钮
  if (currentModel.value.reasoning === currentModel.value.id) return true
  
  // 其他情况下，根据 isReasoning 状态
  return isReasoning.value
})

// 根据时间显示不同的欢迎语
const welcomeMessage = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) {
    return '早上好，今天有什么可以帮你？'
  } else if (hour < 18) {
    return '下午好，有什么可以帮你？'
  } else {
    return '晚上好，有什么可以帮你？'
  }
})

/**
 * 获取对话项的下拉菜单选项
 */
const getDropdownOptions = (conversation) => {
  return [
    {
      label: '重命名',
      key: 'rename',
      icon: () => h(NIcon, null, { default: () => h(Edit) })
    },
    {
      label: '分享',
      key: 'share',
      icon: () => h(NIcon, null, { default: () => h(ShareIcon) })
    },
    {
      type: 'divider'
    },
    {
      label: '删除',
      key: 'delete',
      props: {
        style: 'color: #e74c3c;'
      },
      icon: () => h(NIcon, null, { default: () => h(Trash) })
    }
  ]
}

/**
 * 处理对话项操作
 */
const handleConversationAction = async (key, conversation) => {
  switch (key) {
    case 'rename':
      startRename(conversation)
      break
    case 'share':
      handleShareConversation(conversation)
      break
    case 'delete':
      handleDeleteConversation(conversation)
      break
  }
}

/**
 * 检查标题是否溢出
 */
const isTitleOverflow = (title) => {
  if (!title) return false
  
  // 创建临时元素来测量文本宽度
  const tempElement = document.createElement('div')
  tempElement.style.visibility = 'hidden'
  tempElement.style.position = 'absolute'
  tempElement.style.whiteSpace = 'nowrap'
  tempElement.style.fontWeight = '500'
  tempElement.style.fontSize = '14px'
  tempElement.textContent = title
  document.body.appendChild(tempElement)
  
  const isOverflow = tempElement.offsetWidth > 180 // 180px是标题容器的最大宽度
  document.body.removeChild(tempElement)
  
  return isOverflow
}

/**
 * 切换侧边栏
 */
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  
  // 仅在非移动端保存侧边栏状态
  if (!isMobile.value) {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value.toString())
  }
}

/**
 * 创建新对话
 */
const createNewChat = async () => {
  // 不再直接创建对话，而是跳转到/路由显示欢迎界面
  router.push('/')
  chatStore.setCurrentConversation(null, false)
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
}

/**
 * 处理重命名对话
 */
const handleRenameConversation = async (conversation) => {
  // 显示输入对话框
  const value = ref(conversation.Title)
  
  dialog.info({
    title: '重命名对话',
    content: () => h('div', {
      style: {
        width: '100%',
        padding: '10px 0'
      }
    }, [
      h('n-input', {
        value: value.value,
        onUpdateValue: (val) => {
          value.value = val
        },
        placeholder: '请输入新的对话名称',
        style: {
          width: '100%'
        }
      })
    ]),
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
        conversation.Title = value.value.trim()
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
  // 显示分享面板
  showSharePanel.value = true
}

/**
 * 处理删除对话
 */
const handleDeleteConversation = async (conversation) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除对话"${conversation.Title || '新对话'}"吗？此操作不可撤销。`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const result = await chatStore.deleteConversation(conversation.ID)
        if (result.success) {
          message.success('对话删除成功')
          
          // 如果删除的是当前对话，跳转到首页
          if (currentConversationId.value === conversation.ID) {
            router.push('/')
            chatStore.setCurrentConversation(null, false)
          }
        } else {
          message.error(result.message || '删除失败')
        }
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

/**
 * 处理分享成功
 */
const handleShareSuccess = () => {
  // 可以在这里添加分享成功后的处理逻辑
  console.log('分享成功')
}

/**
 * 处理关闭分享面板
 */
const handleCloseSharePanel = () => {
  showSharePanel.value = false
}

/**
 * 用户下拉菜单选项
 */
const userDropdownOptions = [
  {
    label: '个人中心',
    key: 'profile',
    icon: () => h(NIcon, null, { default: () => h(User) })
  },
  {
    label: '退出登录',
    key: 'logout',
    props: {
      style: 'color: #e74c3c;'
    },
    icon: () => h(NIcon, null, { default: () => h(Logout) })
  }
]

/**
 * 处理用户下拉菜单选择
 */
const handleUserDropdownSelect = (key) => {
  switch (key) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      handleLogout()
      break
  }
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
      sidebarCollapsed.value = true // 移动端默认折叠
    }
  }
  
  // 更新侧边栏宽度
  sidebarWidth.value = sidebarCollapsed.value ? 60 : 280
}

// 监听侧边栏折叠状态变化
watch(sidebarCollapsed, (newVal) => {
  sidebarWidth.value = newVal ? 60 : 280
})

/**
 * 处理欢迎界面发送消息
 */
const handleWelcomeSendMessage = async (content) => {
  if (!content) return

  try {
    // 1. 用户在欢迎页面输入消息
    // 2. 用户点击发送按钮
    
    // 3. 前端访问newconversation路由，创建新对话，返回值得到新对话id
    isGenerating.value = true
    
    const createResult = await chatStore.createConversation()
    
    if (createResult.success) {
      const newConversationId = createResult.data?.conversationID
      
      if (newConversationId) {
        // 4. welcome-state删除，并跳转到具体对话界面
        // 跳转时添加skipCheck参数，避免组件挂载后自动检查未完成对话
        router.push(`/c/${newConversationId}?skipCheck=true`)
        
        // 使用 nextTick 确保路由跳转完成后再添加消息
        await nextTick()
        
        // 设置当前对话，但不检查未完成对话以避免冲突，也不获取消息因为是新对话
        chatStore.setCurrentConversation({
          ID: newConversationId,
          Title: null
        }, false) // false表示不检查未完成对话
        
        // 等待状态更新完成
        await nextTick()
        
        // 获取当前选中的模型信息
        const currentModel = chatStore.models.find(m => m.id === chatStore.selectedModel)
        const modelName = currentModel ? currentModel.name : '未知模型'
        const modelAvatar = modelName.charAt(0).toUpperCase()
        
        // 添加用户消息到本地状态
        const userMessage = {
          id: generateSnowflakeId().toString(),
          content: content,
          role: 'user',
          createdAt: new Date().toISOString(),
          name: userInfo.value?.username || '用户',
          avatar: userInfo.value?.avatar || null
        }
        chatStore.messages.push(userMessage)
        
        // 添加AI消息占位符
        const aiMessage = {
          id: generateSnowflakeId().toString(),
          content: '',
          role: 'assistant',
          createdAt: new Date().toISOString(),
          isStreaming: true,
          name: modelName,
          avatar: modelAvatar
        }
        chatStore.messages.push(aiMessage)
        
        // 强制更新以确保消息显示
        await nextTick()
        
        // 5. 流式请求传输
        const messageData = {
          prompt: content,
          conversationID: parseInt(newConversationId, 10),
          model: chatStore.selectedModel,
          messageUserID: parseInt(userMessage.id, 10),
          messageAssistantID: parseInt(aiMessage.id, 10),
          reasoning: isReasoning.value || (currentModel && currentModel.reasoning === currentModel.id)
        }
        
        try {
          // 设置生成状态
          chatStore.isGenerating = true

          let accumulatedContent = ''
          
          // 使用流式发送
          await chatApi.sendMessage(
            messageData,
            (content) => {
              // 流式接收内容
              accumulatedContent += content
              // 更新最后一条消息的内容
              const lastMessage = chatStore.messages[chatStore.messages.length - 1]
              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.content = accumulatedContent
              }
            },
            (error) => {
              message.error('消息发送失败')
              console.error('消息发送失败:', error)
              isGenerating.value = false
            },
            async () => {
              // 完成回调
              const lastMessage = chatStore.messages[chatStore.messages.length - 1]
              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.isStreaming = false
              }
              isGenerating.value = false
              chatStore.isGenerating = false
              
              // 移除URL中的skipCheck参数，但不刷新页面
              if (route.query.skipCheck) {
                router.replace({ 
                  path: `/c/${newConversationId}`,
                  query: {} 
                })
              }
            }
          )
        } catch (error) {
          message.error(error.message || '发送失败')
          isGenerating.value = false
        }
      }
    } else {
      message.error(createResult.message || '创建对话失败')
      isGenerating.value = false
    }
  } catch (error) {
    console.error('创建对话失败:', error)
    message.error('创建对话失败')
    isGenerating.value = false
  }
}

/**
 * 处理分享消息
 */
const handleShareMessage = async (message) => {
  // 显示分享面板
  showSharePanel.value = true
}

/**
 * 处理文件上传
 */
const handleFileUpload = () => {
  message.info('文件上传功能开发中...')
}

/**
 * 切换推理模式
 */
const toggleReasoning = () => {
  // 如果当前模型的 reasoning 字段等于模型 ID，表示只支持推理，不能切换
  if (currentModel.value && currentModel.value.reasoning === currentModel.value.id) {
    return
  }
  
  isReasoning.value = !isReasoning.value
}

/**
 * 处理停止生成
 */
const handleStopGeneration = async () => {
  try {
    // 获取当前对话ID
    const conversationId = chatStore.currentConversation?.ID;
    if (!conversationId) {
      message.error('无法获取当前对话ID');
      return;
    }
    
    // 调用停止生成接口，传递对话ID
    await chatApi.stopGeneration({ conversationID: parseInt(conversationId, 10) });
    // 更新状态
    chatStore.isGenerating = false;
    isGenerating.value = false;
    
    // 移除流式标记
    const lastMessage = chatStore.messages[chatStore.messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.isStreaming = false;
    }
    
    message.info('已停止生成');
  } catch (error) {
    console.error('停止生成失败:', error);
    message.error('停止失败: ' + (error.message || '未知错误'));
  }
}

/**
 * 开始重命名对话
 */
const startRename = (conversation) => {
  renamingConversationId.value = conversation.ID
  renamingTitle.value = conversation.Title || ''
  
  // 等待DOM更新后聚焦输入框
  nextTick(() => {
    if (renameInputRef.value) {
      renameInputRef.value.focus()
    }
  })
}

/**
 * 保存重命名
 */
const saveRename = async (conversation) => {
  if (!renamingTitle.value.trim()) {
    message.error('对话名称不能为空')
    return
  }
  
  try {
    // 这里应该调用API更新对话标题
    // 由于API文档中没有提供更新对话标题的接口，暂时只更新本地状态
    conversation.Title = renamingTitle.value.trim()
    message.success('对话重命名成功')
  } catch (error) {
    console.error('重命名对话失败:', error)
    message.error('重命名对话失败')
  } finally {
    // 重置重命名状态
    renamingConversationId.value = null
    renamingTitle.value = ''
  }
}

/**
 * 取消重命名
 */
const cancelRename = () => {
  renamingConversationId.value = null
  renamingTitle.value = ''
}

/**
 * 处理重命名时的键盘事件
 */
const handleRenameKeydown = (conversation) => (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    saveRename(conversation)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelRename()
  }
}

/**
 * 切换欢迎界面模型下拉框显示状态
 */
const toggleWelcomeModelDropdown = (event) => {
  // 阻止事件冒泡
  event.stopPropagation()
  showWelcomeModelDropdown.value = !showWelcomeModelDropdown.value
}

/**
 * 关闭欢迎界面模型下拉框
 */
const closeWelcomeModelDropdown = () => {
  showWelcomeModelDropdown.value = false
}

/**
 * 选择欢迎界面模型
 */
const selectWelcomeModel = (modelId) => {
  chatStore.selectedModel = modelId
  closeWelcomeModelDropdown()
}

    // 监听路由变化
    watch(
      () => route.params.conversationId,
      async (conversationId) => {
        console.log('路由变化，对话ID:', conversationId)
        if (conversationId) {
          // 查找对话是否存在 (需要转换类型进行比较)
          let conversation = chatStore.conversations.find(conv => conv.ID === parseInt(conversationId))
          
          if (conversation) {
            // 检查是否有skipCheck参数，如果有则不检查未完成对话
            const checkUnfinished = !route.query.skipCheck
            chatStore.setCurrentConversation(conversation, checkUnfinished)
          } else {
            // 如果对话不存在，先尝试刷新对话列表
            console.log('对话不存在，尝试刷新对话列表')
            const response = await chatApi.getConversations()
            if (response.success) {
              chatStore.conversations = response.data?.conversations || []
              // 再次查找对话 (需要转换类型进行比较)
              let refreshedConversation = chatStore.conversations.find(conv => conv.ID === parseInt(conversationId))
              
              if (refreshedConversation) {
                // 检查是否有skipCheck参数，如果有则不检查未完成对话
                const checkUnfinished = !route.query.skipCheck
                chatStore.setCurrentConversation(refreshedConversation, checkUnfinished)
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
          chatStore.setCurrentConversation(null, false)
        }
      },
      { immediate: true }
    )

    // 组件挂载时加载数据
    onMounted(async () => {
      console.log('聊天页面挂载，开始加载数据')
      
      // 加载侧边栏折叠状态（仅在非移动端）
      if (!isMobile.value) {
        const savedSidebarState = localStorage.getItem('sidebarCollapsed')
        if (savedSidebarState !== null) {
          sidebarCollapsed.value = savedSidebarState === 'true'
          sidebarWidth.value = sidebarCollapsed.value ? 60 : 280
        }
      }
      
      // 获取对话列表
      try {
        const response = await chatApi.getConversations()
        console.log('获取对话列表响应:', response)
        
        if (response.success) {
          chatStore.conversations = response.data?.conversations || []
          // 隐藏对话列表骨架屏
          showConversationsSkeleton.value = false
        } else {
          message.error(response.message || '获取对话列表失败')
          // 即使失败也隐藏骨架屏
          showConversationsSkeleton.value = false
        }
        
        // 获取模型列表
        await chatStore.fetchModels()
      } catch (error) {
        console.error('获取数据失败:', error)
        message.error('获取数据失败')
        // 即使失败也隐藏骨架屏
        showConversationsSkeleton.value = false
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
  background-color: #f8f9fa;
}

/* 左侧侧边栏 */
.sidebar {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  color: #333;
  z-index: 100;
  border-radius: 0 25px 25px 0;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 16px;
  background-color: #ffffff;
  border-radius: 0 25px 0 0;
}

.sidebar-title-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.toggle-btn {
  color: #333;
  width: 34px;
  height: 34px;
}

.new-chat-btn {
  background-color: #18a058;
  color: white;
  border-radius: 12px;
  font-weight: 500;
  height: 40px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.new-chat-btn:hover {
  background-color: #28c76f;
}

.new-chat-btn-collapsed {
  background-color: #18a058;
  color: white;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  transition: background-color 0.2s;
}

.new-chat-btn-collapsed:hover {
  background-color: #28c76f;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conversation-item-wrapper {
  width: 250px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #ffffff;
  margin-bottom: 2px;
  position: relative;
}

.conversation-item-wrapper:hover {
  background-color: #f8f9fa;
}

.conversation-item-wrapper.active {
  background-color: #e9ecef;
}

.conversation-item {
  flex: 1;
  padding: 8px 12px;
  min-width: 0; /* 允许文本截断 */
  display: flex;
  align-items: center;
}

.conversation-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.rename-input-container {
  display: flex;
  align-items: center;
  width: 100%;
}

.rename-input-container :deep(.n-input) {
  flex: 1;
  margin-right: 4px;
}

.rename-actions {
  display: flex;
  gap: 4px;
}

.conversation-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  margin-right: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0; /* 防止操作按钮被压缩 */
}

.conversation-item-wrapper:hover .conversation-actions {
  opacity: 1;
}

/* 右侧主内容区域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: #f8f9fa;
}

/* 顶部导航栏 */
.top-navbar {
  position: absolute;
  top: 5px;
  right: 0;
  padding: 16px 24px;
  z-index: 10;
}

.navbar-right .user-avatar {
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 50%;
}

.navbar-right .user-avatar:hover {
  transform: scale(1.05);
}

/* 欢迎状态 */
.welcome-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
  top: -3rem;
  position: relative;
}

.welcome-content h2 {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
  text-align: center; /* 添加这行使文字水平居中 */
}

/* 对话列表骨架屏 */
.conversations-skeleton {
  padding: 8px;
}

.skeleton-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.mobile-toggle-btn {
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.mobile-new-chat-btn {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .sidebar {
    width: 70%;
    transition: transform 0.3s ease;
  }
  
  .sidebar:not(.collapsed) {
    width: 70%;
    transition: transform 0.3s ease;
  }
  
  .sidebar.collapsed {
    width: 70%;
    overflow: hidden;
    transition: transform 0.3s ease;
  }
}

/* 移动端顶部按钮 */
.mobile-top-buttons {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 90;
  display: none;
}

.mobile-buttons-container {
  display: flex;
  gap: 12px;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.mobile-toggle-btn,
.mobile-new-chat-btn {
  box-shadow: none;
}

/* 遮罩层 */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 80; /* 确保遮罩层在按钮下方但在主内容上方 */
}

/* 移动端展开的侧边栏 */
.sidebar.mobile-expanded {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 70%;
  z-index: 85; /* 确保侧边栏在遮罩层上方但在按钮下方 */
  border-radius: 0;
  transform: translateX(0);
  transition: transform 0.3s ease;
}

.sidebar.mobile-collapsed {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 70%;
  z-index: 85; /* 确保侧边栏在遮罩层上方但在按钮下方 */
  border-radius: 0;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
}

@media (max-width: 768px) {
  .mobile-top-buttons {
    display: flex;
  }
}

@media (min-width: 769px) {
  .mobile-top-buttons {
    display: none;
  }
  
  .sidebar-overlay {
    display: none;
  }
}
</style>