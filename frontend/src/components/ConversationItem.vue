<template>
  <div 
    class="conversation-item"
    :class="{ 'active': isActive }"
    @click="handleClick"
  >
    <div class="conversation-content">
      <div class="conversation-title">
        {{ conversation.title || '新对话' }}
      </div>
      <div class="conversation-time">
        {{ formatTime(conversation.updatedAt || conversation.createdAt) }}
      </div>
    </div>
    
    <div class="conversation-actions" @click.stop>
      <n-dropdown
        :options="dropdownOptions"
        @select="handleAction"
        trigger="click"
      >
        <n-button
          quaternary
          circle
          size="small"
          class="action-btn"
        >
          <template #icon>
            <n-icon>
              <MoreHorizontal />
            </n-icon>
          </template>
        </n-button>
      </n-dropdown>
    </div>
  </div>
</template>

<script>
import { computed, h } from 'vue'
import { NButton, NIcon, NDropdown, useMessage } from 'naive-ui'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Share 
} from '@vicons/tabler'
import { useChatStore } from '@/stores/chat'

export default {
  name: 'ConversationItem',
  components: {
    NButton,
    NIcon,
    NDropdown,
    MoreHorizontal,
    Edit,
    Trash2,
    Share
  },
  props: {
    /**
     * 对话数据
     */
    conversation: {
      type: Object,
      required: true
    },
    /**
     * 是否为当前激活的对话
     */
    isActive: {
      type: Boolean,
      default: false
    }
  },
  emits: ['select', 'delete', 'rename', 'share'],
  setup(props, { emit }) {
    const message = useMessage()
    const chatStore = useChatStore()

    // 下拉菜单选项
    const dropdownOptions = computed(() => [
      {
        label: '重命名',
        key: 'rename',
        icon: () => h(NIcon, null, { default: () => h(Edit) })
      },
      {
        label: '分享',
        key: 'share',
        icon: () => h(NIcon, null, { default: () => h(Share) })
      },
      {
        type: 'divider'
      },
      {
        label: '删除',
        key: 'delete',
        icon: () => h(NIcon, null, { default: () => h(Trash2) }),
        props: {
          style: 'color: #e74c3c;'
        }
      }
    ])

    /**
     * 格式化时间显示
     * @param {string} timeString - 时间字符串
     * @returns {string} 格式化后的时间
     */
    const formatTime = (timeString) => {
      if (!timeString) return ''
      
      const time = new Date(timeString)
      const now = new Date()
      const diff = now - time
      
      // 小于1分钟
      if (diff < 60000) {
        return '刚刚'
      }
      
      // 小于1小时
      if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`
      }
      
      // 小于24小时
      if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`
      }
      
      // 小于7天
      if (diff < 604800000) {
        return `${Math.floor(diff / 86400000)}天前`
      }
      
      // 超过7天显示具体日期
      return time.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      })
    }

    /**
     * 处理对话点击
     */
    const handleClick = () => {
      emit('select', props.conversation)
    }

    /**
     * 处理下拉菜单操作
     * @param {string} key - 操作类型
     */
    const handleAction = async (key) => {
      switch (key) {
        case 'rename':
          emit('rename', props.conversation)
          break
        
        case 'share':
          emit('share', props.conversation)
          break
        
        case 'delete':
          try {
            const result = await chatStore.deleteConversation(props.conversation.id)
            if (result.success) {
              message.success('对话删除成功')
              emit('delete', props.conversation)
            } else {
              message.error(result.message || '删除失败')
            }
          } catch (error) {
            message.error('删除失败')
          }
          break
      }
    }

    return {
      dropdownOptions,
      formatTime,
      handleClick,
      handleAction
    }
  }
}
</script>

<style scoped>
.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.conversation-item:hover {
  background-color: #f5f5f5;
}

.conversation-item.active {
  background-color: #e3f2fd;
  border-color: #2196f3;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-time {
  font-size: 12px;
  color: #999;
}

.conversation-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.conversation-item:hover .conversation-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
}

@media (max-width: 768px) {
  .conversation-item {
    padding: 10px 12px;
  }
  
  .conversation-actions {
    opacity: 1;
  }
}
</style>