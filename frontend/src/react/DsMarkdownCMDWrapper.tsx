import React, { useRef, useEffect } from 'react'
import { MarkdownCMD } from 'ds-markdown'

export interface DsMarkdownCMDWrapperProps {
  content: string
  interval?: number
  answerType?: 'answer' | 'thinking'
  showCursor?: boolean
  cursor?: 'line' | 'block' | 'underscore' | 'circle'
  theme?: 'light' | 'dark'
  onEnd?: () => void
  onTypedChar?: (data: any) => void
}

export default function DsMarkdownCMDWrapper(props: DsMarkdownCMDWrapperProps) {
  const {
    content,
    interval = 20,
    answerType = 'answer',
    showCursor = false,
    cursor = 'line',
    theme,
    onEnd,
    onTypedChar,
  } = props

  const cmdRef = useRef<any>(null)
  const prevContentRef = useRef<string>('')
  const isInitializedRef = useRef<boolean>(false)

  // 当内容变化时，使用 push 方法追加新内容
  useEffect(() => {
    if (cmdRef.current) {
      // 如果是第一次且有内容，直接 push 全部内容
      if (!isInitializedRef.current && content) {
        cmdRef.current.push(content, answerType)
        prevContentRef.current = content
        isInitializedRef.current = true
      } else if (content !== prevContentRef.current) {
        // 后续只 push 新增的内容
        const newContent = content.slice(prevContentRef.current.length)
        if (newContent) {
          cmdRef.current.push(newContent, answerType)
        }
        prevContentRef.current = content
      }
    }
  }, [content, answerType])

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
}
