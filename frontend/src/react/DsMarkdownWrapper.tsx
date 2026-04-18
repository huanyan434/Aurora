import React, { useRef, useEffect } from 'react'
import { Markdown as DsMarkdown, MarkdownCMD } from 'ds-markdown'

export interface DsMarkdownWrapperProps {
  content: string
  interval?: number
  answerType?: 'answer' | 'thinking'
  showCursor?: boolean
  cursor?: 'line' | 'block' | 'underscore' | 'circle'
  theme?: 'light' | 'dark'
  onEnd?: () => void
  onTypedChar?: (data: any) => void
  isStreaming?: boolean
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
    onTypedChar,
    isStreaming = false,
  } = props

  const cmdRef = useRef<any>(null)
  const prevContentRef = useRef<string>('')

  // 当内容变化时，如果是流式模式，使用 push 方法
  useEffect(() => {
    if (isStreaming && cmdRef.current && content !== prevContentRef.current) {
      // 计算新增的内容
      const newContent = content.slice(prevContentRef.current.length)
      if (newContent) {
        cmdRef.current.push(newContent, answerType)
      }
      prevContentRef.current = content
    }
  }, [content, isStreaming, answerType])

  // 重置 ref 当切换消息时
  useEffect(() => {
    // 当从流式切换到非流式时，重置 prevContentRef
    if (!isStreaming) {
      prevContentRef.current = ''
    }
  }, [isStreaming])

  if (isStreaming) {
    // 流式消息使用 MarkdownCMD
    return React.createElement(
      'div',
      { className: 'ds-markdown-transparent-bg' },
      React.createElement(MarkdownCMD, {
        ref: cmdRef,
        interval,
        answerType,
        showCursor,
        cursor,
        theme,
        onEnd,
        onTypedChar,
      })
    )
  } else {
    // 历史消息使用 DsMarkdown
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
          onTypedChar,
          children: content,
        }
      )
    )
  }
}
