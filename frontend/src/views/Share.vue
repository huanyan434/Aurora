<template>
  <div class="share-container">
    <!-- 头部 -->
    <div class="share-header">
      <div class="header-content">
        <div class="logo">
          <h1>Aurora AI</h1>
          <span class="subtitle">智能助手对话分享</span>
        </div>
        <n-button @click="goToApp" type="primary">
          使用 Aurora AI
        </n-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <n-spin size="large" />
      <p>正在加载分享内容...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <n-result status="404" title="分享不存在" description="该分享链接已失效或不存在">
        <template #footer>
          <n-button @click="goToApp" type="primary">
            前往 Aurora AI
          </n-button>
        </template>
      </n-result>
    </div>

    <!-- 分享内容 -->
    <div v-else class="share-content">
      <!-- 对话信息 -->
      <div class="conversation-info">
        <h2>{{ shareData.title || '对话分享' }}</h2>
        <div class="conversation-meta">
          <span class="share-time">分享于 {{ formatTime(shareData.createdAt) }}</span>
          <span class="message-count">共 {{ shareData.messages?.length || 0 }} 条消息</span>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="messages-container">
        <div class="messages-list">
          <div
            v-for="message in shareData.messages"
            :key="message.id"
            class="message-item"
            :class="{ 'user-message': message.role === 'user', 'assistant-message': message.role === 'assistant' }"
          >
            <div class="message-avatar">
              <n-avatar
                v-if="message.role === 'user'"
                :size="32"
                :src="shareData.userAvatar"
                :fallback-src="'/user-avatar.png'"
              >
                {{ shareData.username?.charAt(0).toUpperCase() || 'U' }}
              </n-avatar>
              <n-avatar
                v-else
                :size="32"
                :src="'/ai-avatar.png'"
                :fallback-src="'/ai-avatar.png'"
              >
                AI
              </n-avatar>
            </div>
            
            <div class="message-content">
              <div class="message-header">
                <span class="message-role">
                  {{ message.role === 'user' ? (shareData.username || '用户') : 'Aurora AI' }}
                </span>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
              
              <div class="message-text">
                <div
                  v-if="message.role === 'assistant'"
                  class="markdown-content"
                  v-html="renderMarkdown(message.content)"
                />
                <div v-else class="plain-text">
                  {{ message.content }}
                </div>
              </div>
              
              <!-- 消息操作 -->
              <div class="message-actions">
                <n-button
                  quaternary
                  size="small"
                  @click="copyMessage(message.content)"
                  title="复制消息"
                >
                  <template #icon>
                    <n-icon>
                      <Copy />
                    </n-icon>
                  </template>
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部信息 -->
      <div class="share-footer">
        <div class="footer-content">
          <p>此对话由 <strong>Aurora AI</strong> 生成</p>
          <div class="footer-actions">
            <n-button @click="copyShareLink" quaternary>
              <template #icon>
                <n-icon>
                  <Share />
                </n-icon>
              </template>
              复制分享链接
            </n-button>
            <n-button @click="goToApp" type="primary">
              开始使用 Aurora AI
            </n-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NIcon,
  NAvatar,
  NSpin,
  NResult,
  useMessage
} from 'naive-ui'
import {
  Copy,
  Share
} from '@vicons/tabler'
import { marked } from 'marked'
import { chatApi } from '@/api/chat'

/**
 * 分享页面组件
 * 用于展示分享的对话内容
 */

const route = useRoute()
const router = useRouter()
const message = useMessage()

// 响应式数据
const loading = ref(true)
const error = ref(false)
const shareData = ref({})

/**
 * 获取分享内容
 */
const fetchShareContent = async () => {
  try {
    loading.value = true
    error.value = false
    
    const shareId = route.params.shareId
    if (!shareId) {
      error.value = true
      return
    }

    const response = await chatApi.getSharedContent(shareId)
    if (response.success) {
      shareData.value = response.data
    } else {
      error.value = true
    }
  } catch (err) {
    console.error('获取分享内容失败:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

/**
 * 渲染Markdown内容
 * @param {string} content - Markdown内容
 * @returns {string} 渲染后的HTML
 */
const renderMarkdown = (content) => {
  try {
    return marked(content, {
      breaks: true,
      gfm: true
    })
  } catch (error) {
    console.error('Markdown渲染失败:', error)
    return content
  }
}

/**
 * 格式化时间
 * @param {string} time - 时间字符串
 * @returns {string} 格式化后的时间
 */
const formatTime = (time) => {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 复制消息内容
 * @param {string} content - 消息内容
 */
const copyMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    message.success('消息已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

/**
 * 复制分享链接
 */
const copyShareLink = async () => {
  try {
    const shareUrl = window.location.href
    await navigator.clipboard.writeText(shareUrl)
    message.success('分享链接已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

/**
 * 前往应用
 */
const goToApp = () => {
  // 如果是在同一域名下，直接跳转
  if (window.location.origin === window.location.origin) {
    router.push('/')
  } else {
    // 否则打开新窗口
    window.open('/', '_blank')
  }
}

// 组件挂载时获取分享内容
onMounted(() => {
  fetchShareContent()
})
</script>

<style scoped>
.share-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.share-header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1890ff;
}

.subtitle {
  font-size: 14px;
  color: #666;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.loading-container p {
  margin-top: 16px;
  color: #666;
}

.share-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.conversation-info {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.conversation-info h2 {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.conversation-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
}

.messages-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.messages-list {
  padding: 20px;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: flex-start;
}

.message-item:last-child {
  margin-bottom: 0;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.message-role {
  font-weight: 600;
  font-size: 14px;
}

.user-message .message-role {
  color: #1890ff;
}

.assistant-message .message-role {
  color: #52c41a;
}

.message-time {
  font-size: 12px;
  color: #999;
}

.message-text {
  margin-bottom: 8px;
}

.markdown-content {
  line-height: 1.6;
  color: #333;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 16px 0 8px 0;
  font-weight: 600;
}

.markdown-content :deep(p) {
  margin: 8px 0;
}

.markdown-content :deep(code) {
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #e0e0e0;
  padding-left: 12px;
  margin: 12px 0;
  color: #666;
}

.plain-text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #333;
}

.message-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-item:hover .message-actions {
  opacity: 1;
}

.share-footer {
  background: white;
  border-radius: 8px;
  margin-top: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.footer-content {
  padding: 24px;
  text-align: center;
}

.footer-content p {
  margin: 0 0 16px 0;
  color: #666;
}

.footer-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

@media (max-width: 768px) {
  .share-content {
    padding: 16px;
  }
  
  .header-content {
    padding: 0 16px;
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .conversation-info {
    padding: 20px;
  }
  
  .conversation-meta {
    flex-direction: column;
    gap: 8px;
  }
  
  .messages-list {
    padding: 16px;
  }
  
  .message-item {
    margin-bottom: 20px;
  }
  
  .footer-actions {
    flex-direction: column;
  }
}
</style>