<template>
  <div 
    class="conversation-item"
    :class="{ 'active': isActive }"
    @click="handleClick"
  >
    <div class="conversation-content">
      <div class="conversation-title">
        {{ conversation.Title || '新对话' }}
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
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon>
                <DotsVertical />
              </n-icon>
            </template>
            <span>操作</span>
          </n-tooltip>
        </n-button>
      </n-dropdown>
    </div>
  </div>
</template>

<script>
import { computed, h } from 'vue'
import { NButton, NIcon, NDropdown, NTooltip, useMessage } from 'naive-ui'
import { 
  DotsVertical, 
  Edit,
  Share 
} from '@vicons/tabler'
import { useChatStore } from '@/stores/chat'

export default {
  name: 'ConversationItem',
  components: {
    NButton,
    NIcon,
    NDropdown,
    DotsVertical,
    Edit,
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
        props: {
          style: 'color: #e74c3c;'
        }
      }
    ])

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
            const result = await chatStore.deleteConversation(props.conversation.ID)
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