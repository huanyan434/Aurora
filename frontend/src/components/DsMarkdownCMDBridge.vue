<template>
  <DsMarkdownCMDWrapper
    :content="content"
    :interval="interval"
    :answerType="answerType"
    :showCursor="showCursor"
    :cursor="cursor"
    :theme="theme"
    :onEnd="onEnd"
    :onTypedChar="onTypedChar"
  />
</template>

<script setup lang="ts">
import { applyReactInVue } from 'veaury'
import { createRoot } from 'react-dom/client'
import DsMarkdownCMDWrapperReact from '../react/DsMarkdownCMDWrapper'

const DsMarkdownCMDWrapper = applyReactInVue(DsMarkdownCMDWrapperReact, {
  react: {
    createRoot
  }
})

interface Props {
  content: string
  interval?: number
  answerType?: 'answer' | 'thinking'
  showCursor?: boolean
  cursor?: 'line' | 'block' | 'underscore' | 'circle'
  theme?: 'light' | 'dark'
  onEnd?: () => void
  onTypedChar?: (data: any) => void
}

withDefaults(defineProps<Props>(), {
  interval: 20,
  answerType: 'answer',
  showCursor: false,
  cursor: 'line',
})
</script>

<style scoped>
</style>
