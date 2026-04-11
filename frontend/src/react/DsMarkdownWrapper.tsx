import React from 'react'
import DsMarkdown from 'ds-markdown'

export interface DsMarkdownWrapperProps {
  content: string
  interval?: number
  answerType?: 'answer' | 'thinking'
  showCursor?: boolean
  cursor?: 'line' | 'block' | 'underscore' | 'circle'
}

export default function DsMarkdownWrapper(props: DsMarkdownWrapperProps) {
  const {
    content,
    interval = 20,
    answerType = 'answer',
    showCursor = false,
    cursor = 'line',
  } = props

  return React.createElement(
    DsMarkdown,
    {
      interval,
      answerType,
      showCursor,
      cursor,
      children: content,
    }
  )
}
