<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import React from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import DsMarkdownWrapper from '@/react/DsMarkdownWrapper'

const props = withDefaults(defineProps<{
  content: string
  interval?: number
  answerType?: 'answer' | 'thinking'
  showCursor?: boolean
  cursor?: 'line' | 'block' | 'underscore' | 'circle'
  disableTyping?: boolean
}>(), {
  interval: 20,
  answerType: 'answer',
  showCursor: false,
  cursor: 'line',
  disableTyping: false,
})

const containerRef = ref<HTMLElement | null>(null)
let root: Root | null = null

function renderReact() {
  if (!containerRef.value) return

  if (!root) {
    root = createRoot(containerRef.value)
  }

  root.render(
    React.createElement(DsMarkdownWrapper, {
      content: props.content,
      interval: props.disableTyping ? 0 : props.interval,
      answerType: props.answerType,
      showCursor: props.showCursor && !props.disableTyping,
      cursor: props.cursor,
    })
  )
}

onMounted(() => {
  renderReact()
})

watch(
  () => [
    props.content,
    props.interval,
    props.answerType,
    props.showCursor,
    props.cursor,
  ],
  () => {
    renderReact()
  }
)

onBeforeUnmount(() => {
  root?.unmount()
  root = null
})
</script>

<template>
  <div class="ds-markdown-bridge">
    <div ref="containerRef" />
  </div>
</template>

<style scoped>
.ds-markdown-bridge {
  width: 100%;
}
</style>
