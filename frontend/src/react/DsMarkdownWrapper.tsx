import React from 'react'
import DsMarkdown from 'ds-markdown'

export interface DsMarkdownWrapperProps {
  content: string
  interval?: number
  answerType?: 'answer' | 'thinking'
  showCursor?: boolean
  cursor?: 'line' | 'block' | 'underscore' | 'circle'
  theme?: 'light' | 'dark'
  onEnd?: () => void
}

export default function DsMarkdownWrapper(props: DsMarkdownWrapperProps) {
  const {
    content,
    interval = 20,
    answerType = 'answer',
    showCursor = false,
    cursor = 'line',
    theme,
    onEnd,
  } = props

  return React.createElement(
    'div',
    { className: 'ds-markdown-transparent-bg' },
    React.createElement(
      DsMarkdown,
      {
        interval,
        answerType,
        showCursor,
        cursor,
        theme,
        onEnd,
        children: content,
      }
    )
  )
}
