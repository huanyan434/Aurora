<template>
  <div class="message-reasoning">
    <div class="reasoning-header">
      <span class="reasoning-title">
        {{ isCompleted ? '已完成思考' : `思考中（用时${reasoningTime}秒）` }}
      </span>
    </div>
    
    <div 
      ref="contentRef"
      class="reasoning-content"
      :class="{ 'expanded': isExpanded }"
    >
      <div 
        class="reasoning-text"
        v-html="formattedContent"
      ></div>
      
      <div 
        v-if="isContentLong && !isExpanded" 
        class="reasoning-overlay"
      >
        <button 
          class="show-more-button"
          @click.stop="toggleExpand"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>查看更多</span>
        </button>
      </div>
      
      <div 
        v-else-if="isContentLong && isExpanded" 
        class="reasoning-overlay expanded"
      >
        <button 
          class="show-more-button"
          @click.stop="toggleExpand"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>收起</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { marked } from 'marked';

interface Props {
  content: string;
  reasoningTime: number;
  isStreaming?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false
});

// 响应式状态
const isCollapsed = ref(false); // 默认展开
const isExpanded = ref(false);

// 计算属性
const isCompleted = computed(() => props.reasoningTime === 0);

const isContentLong = computed(() => {
  if (!props.content) return false;
  // 简单判断内容是否较长（超过3行，约150字符）
  return props.content.length > 150;
});

const formattedContent = computed(() => {
  if (!props.content) return '';
  
  try {
    // 使用 marked 渲染 Markdown 内容
    return marked.parse(props.content, {
      breaks: true,
      gfm: true
    });
  } catch (error) {
    console.error('推理内容Markdown渲染失败:', error);
    return props.content.replace(/\n/g, '<br>');
  }
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

// 监听内容变化和流式状态
watch([() => props.content, () => props.isStreaming], ([newContent, newIsStreaming]) => {
  // 如果是流式传输且有内容，则展开
  if (newIsStreaming && newContent) {
    isCollapsed.value = false;
  }
  // 如果不是流式传输（历史记录），也默认展开
  else if (!newIsStreaming) {
    isCollapsed.value = false;
  }
}, { immediate: true });
</script>

<style scoped>
.message-reasoning {
  background-color: #ffffff;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  overflow: hidden;
  padding: 4px;
}

.reasoning-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  font-size: 14px;
  color: #475569;
  user-select: none;
}

.reasoning-title {
  font-weight: 500;
}

.collapse-icon {
  transition: transform 0.3s ease;
  color: #94a3b8;
}

.collapse-icon.rotated {
  transform: rotate(180deg);
}

.reasoning-content {
  padding: 0 14px 10px 14px;
  position: relative;
  max-height: 120px;
  overflow: hidden;
}

.reasoning-content.expanded {
  max-height: none;
}

.reasoning-text {
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
  padding-top: 8px;
}

.reasoning-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  padding: 30px 0 8px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.9), white);
  display: flex;
  justify-content: center;
}

.reasoning-overlay.expanded {
  position: static;
  background: none;
  padding: 8px 0 0;
  text-align: left;
}

.show-more-button {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.show-more-button:hover {
  background: white;
  border-color: #94a3b8;
  color: #334155;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.show-more-button:active {
  transform: translateY(1px);
  transition: all 0.1s cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>