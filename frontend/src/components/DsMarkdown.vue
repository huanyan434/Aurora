<script setup lang="ts">
import DsMarkdownBridge from '@/components/DsMarkdownBridge.vue'

withDefaults(defineProps<{
  content: string
  interval?: number
  showCursor?: boolean
  cursor?: 'line' | 'block' | 'underscore' | 'circle'
  answerType?: 'answer' | 'thinking'
  disableTyping?: boolean
  onEnd?: () => void
}>(), {
  interval: 15,
  showCursor: true,
  cursor: 'circle',
  answerType: 'answer',
  disableTyping: false,
})
</script>

<template>
  <div class="ds-markdown">
    <DsMarkdownBridge
      :content="content"
      :interval="disableTyping ? 0 : interval"
      :show-cursor="showCursor && !disableTyping"
      :cursor="cursor"
      :answer-type="answerType"
      :on-end="onEnd"
    />
  </div>
</template>

<style scoped>
.ds-markdown {
  width: 100%;
  line-height: 1.75;
  color: #1f2329;
  word-break: break-word;
}

.ds-markdown :deep(p) {
  margin: 0.5em 0;
}

.ds-markdown :deep(pre) {
  overflow-x: auto;
  padding: 12px;
  border-radius: 10px;
}

.ds-markdown :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.ds-markdown :deep(ul),
.ds-markdown :deep(ol) {
  padding-left: 1.4em;
}

.ds-markdown :deep(blockquote) {
  margin: 1em 0;
  padding-left: 12px;
  border-left: 4px solid #d0d7de;
  color: #57606a;
}

/* 深色模式适配 */
.dark .ds-markdown {
  color: #e5e7eb;
}

.dark .ds-markdown :deep(pre) {
  background: #0f0f0f;
}

.dark .ds-markdown :deep(blockquote) {
  border-left-color: #4b5563;
  color: #9ca3af;
}
</style>

<style>
/* 透明背景（全局样式，因为需要应用到 React 组件） */
.ds-markdown-transparent-bg,
.dark .ds-markdown-transparent-bg {
  background: transparent !important;
}
</style>
