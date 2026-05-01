<template>
  <section
    class="message-reasoning"
    :class="{
      'message-reasoning-streaming': isStreaming,
      'message-reasoning-completed': isCompleted,
      'message-reasoning-expanded': isExpanded,
    }"
  >
    <div class="reasoning-header">
      <div class="reasoning-header-main">
        <div class="reasoning-status-dot"></div>
        <div class="reasoning-heading-group">
          <span class="reasoning-label">深度思考</span>
          <span class="reasoning-title">
            {{ isCompleted ? '思考完成' : `思考中 · 已用时 ${reasoningTime} 秒` }}
          </span>
        </div>
      </div>
    </div>

    <div
      ref="contentRef"
      class="reasoning-content"
      :class="{ expanded: isExpanded }"
    >
      <div class="reasoning-text" v-html="formattedContent"></div>

      <div v-if="isContentLong && !isExpanded" class="reasoning-overlay">
        <button class="show-more-button" @click.stop="toggleExpand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>展开思考过程</span>
        </button>
      </div>

      <div v-else-if="isContentLong && isExpanded" class="reasoning-overlay expanded">
        <button class="show-more-button" @click.stop="toggleExpand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>收起思考过程</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { marked } from 'marked';

interface Props {
  content: string;
  reasoningTime: number;
  isStreaming?: boolean;
  disableTyping?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
  disableTyping: false,
});

// const contentRef = ref<HTMLElement | null>(null);
const isExpanded = ref(false);

const isCompleted = computed(() => props.reasoningTime === 0);

const isContentLong = computed(() => {
  if (!props.content) return false;
  return props.content.length > 150;
});

const formattedContent = computed(() => {
  if (!props.content) return '';

  try {
    return marked.parse(props.content, {
      breaks: true,
      gfm: true,
    });
  } catch (error) {
    console.error('推理内容Markdown渲染失败:', error);
    return props.content.replace(/\n/g, '<br>');
  }
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};
</script>

<style scoped>
.message-reasoning {
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid rgba(59, 130, 246, 0.16);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(12px);
}

.message-reasoning-streaming {
  border-color: rgba(59, 130, 246, 0.28);
  box-shadow: 0 14px 36px rgba(37, 99, 235, 0.12);
}

.message-reasoning-completed {
  border-color: rgba(148, 163, 184, 0.22);
}

.reasoning-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.88) 0%, rgba(255, 255, 255, 0) 100%);
}

.reasoning-header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.reasoning-status-dot {
  position: relative;
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 9999px;
  background: #2563eb;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.12);
}

.message-reasoning-streaming .reasoning-status-dot {
  animation: reasoning-pulse 1.8s ease-in-out infinite;
}

.reasoning-heading-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.reasoning-label {
  font-size: 12px;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #2563eb;
}

.reasoning-title {
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
  color: #334155;
}

.reasoning-content {
  position: relative;
  overflow: hidden;
  max-height: 164px;
  padding: 4px 16px 14px;
}

.reasoning-content.expanded {
  max-height: none;
}

.reasoning-text {
  padding-top: 6px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.75;
  color: #64748b;
  word-break: break-word;
}

.reasoning-text :deep(p) {
  margin: 0.55em 0;
}

.reasoning-text :deep(:first-child) {
  margin-top: 0;
}

.reasoning-text :deep(:last-child) {
  margin-bottom: 0;
}

.reasoning-text :deep(ul),
.reasoning-text :deep(ol) {
  padding-left: 1.3em;
}

.reasoning-text :deep(code) {
  padding: 0.12rem 0.35rem;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.12);
  font-size: 0.92em;
}

.reasoning-text :deep(pre) {
  overflow-x: auto;
  margin: 0.9em 0;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.reasoning-text :deep(blockquote) {
  margin: 0.85em 0;
  padding-left: 12px;
  border-left: 3px solid rgba(59, 130, 246, 0.3);
  color: #64748b;
}

.reasoning-overlay {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  justify-content: center;
  padding: 40px 16px 2px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0) 0%, rgba(248, 250, 252, 0.92) 56%, rgba(248, 250, 252, 1) 100%);
}

.reasoning-overlay.expanded {
  position: static;
  padding: 12px 0 0;
  background: none;
}

.show-more-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.9);
  color: #334155;
  font-size: 12px;
  line-height: 1;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
  transition:
    transform var(--transition-duration-normal) ease,
    box-shadow var(--transition-duration-normal) ease,
    border-color var(--transition-duration-normal) ease,
    color var(--transition-duration-normal) ease,
    background-color var(--transition-duration-normal) ease;
}

.show-more-button:hover {
  transform: translateY(-1px);
  border-color: rgba(59, 130, 246, 0.28);
  background: #ffffff;
  color: #1d4ed8;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12);
}

.show-more-button:active {
  transform: translateY(0);
}

.message-reasoning-expanded .show-more-button {
  background: rgba(248, 250, 252, 0.92);
}

.dark .message-reasoning {
  border-color: rgba(96, 165, 250, 0.18);
  background: linear-gradient(180deg, rgba(23, 23, 23, 0.96) 0%, rgba(15, 23, 42, 0.96) 100%);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.24);
}

.dark .message-reasoning-streaming {
  border-color: rgba(96, 165, 250, 0.28);
  box-shadow: 0 16px 38px rgba(37, 99, 235, 0.18);
}

.dark .reasoning-header {
  border-bottom-color: rgba(71, 85, 105, 0.28);
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0) 100%);
}

.dark .reasoning-status-dot {
  background: #60a5fa;
  box-shadow: 0 0 0 6px rgba(96, 165, 250, 0.14);
}

.dark .reasoning-label {
  color: #93c5fd;
}

.dark .reasoning-title {
  color: #e2e8f0;
}

.dark .reasoning-badge {
  border-color: rgba(71, 85, 105, 0.42);
  background: rgba(15, 23, 42, 0.68);
  color: #cbd5e1;
}

.dark .message-reasoning-streaming .reasoning-badge {
  border-color: rgba(96, 165, 250, 0.22);
  color: #93c5fd;
}

.dark .reasoning-text {
  color: #cbd5e1;
}

.dark .reasoning-text :deep(code) {
  background: rgba(51, 65, 85, 0.45);
}

.dark .reasoning-text :deep(pre) {
  border-color: rgba(71, 85, 105, 0.32);
  background: rgba(2, 6, 23, 0.52);
}

.dark .reasoning-text :deep(blockquote) {
  border-left-color: rgba(96, 165, 250, 0.4);
  color: #94a3b8;
}

.dark .reasoning-overlay {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.92) 56%, rgba(15, 23, 42, 1) 100%);
}

.dark .show-more-button {
  border-color: rgba(71, 85, 105, 0.44);
  background: rgba(15, 23, 42, 0.88);
  color: #cbd5e1;
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.34);
}

.dark .show-more-button:hover {
  border-color: rgba(96, 165, 250, 0.36);
  background: rgba(30, 41, 59, 0.96);
  color: #dbeafe;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.2);
}

@keyframes reasoning-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.82;
  }
}

@media (max-width: 640px) {
  .reasoning-header {
    align-items: flex-start;
    padding: 13px 14px 10px;
  }

  .reasoning-header-main {
    gap: 10px;
  }

  .reasoning-title {
    font-size: 13px;
  }

  .reasoning-content {
    max-height: 148px;
    padding: 2px 14px 12px;
  }

  .reasoning-text {
    font-size: 12px;
    line-height: 1.7;
  }

  .show-more-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
