// 获取模型列表
export interface ModelsListResponse {
  models: any[]
}

export const getModelsList = async () => {
  const response = await fetch('/api/models_list')
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 获取对话列表
export interface Conversation {
  id: number
  userID: number
  title: string
  createdAt: string
  updatedAt: string
}

export interface ConversationsListResponseSuccess {
  conversations: Conversation[]
  success: true
}

export interface ConversationsListResponseFailed {
  error: string
  success: false
}

export const getConversationsList = async () => {
  const response = await fetch('/chat/conversations_list')
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 删除对话
export interface DeleteConversationRequest {
  conversationID: number
}

export interface DeleteConversationResponseSuccess {
  success: true
}

export interface DeleteConversationResponseFailed {
  error: string
  success: false
}

export const deleteConversation = async (data: DeleteConversationRequest) => {
  const response = await fetch('/chat/delete_conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 删除消息
export interface DeleteMessageRequest {
  messageID: number
}

export interface DeleteMessageResponseSuccess {
  success: true
}

export interface DeleteMessageResponseFailed {
  error: string
  success: false
}

export const deleteMessage = async (data: DeleteMessageRequest) => {
  const response = await fetch('/chat/delete_message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 生成AI回复
export interface GenerateRequest {
  base64?: string
  conversationID: number
  messageAssistantID?: number
  messageUserID?: number
  model: string
  prompt: string
  reasoning: boolean
}

export interface GenerateResponseSuccess {
  content: string
  error: string
  reasoningContent: string
  reasoningTime: number
  success: true
}

export interface GenerateResponseFailed {
  content: string
  error: string
  reasoningContent: string
  reasoningTime: number
  success: false
}

export const generate = async (data: GenerateRequest) => {
  const response = await fetch('/chat/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 获取历史消息
export interface MessagesListRequest {
  conversationID: number
}

export interface Message {
  id: number
  conversationID: number
  role: string
  content: string
  reasoningContent: string
  createdAt: string
}

export interface MessagesListResponseSuccess {
  messages: string
  success: true
}

export interface MessagesListResponseFailed {
  error: string
  success: false
}

export const getMessagesList = async (data: MessagesListRequest) => {
  const response = await fetch('/chat/messages_list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 创建新对话
export interface NewConversationResponseSuccess {
  conversationID: string
  success: true
}

export interface NewConversationResponseFailed {
  error: string
  success: false
}

export const newConversation = async () => {
  const response = await fetch('/chat/new_conversation')
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 分享消息
export interface ShareMessagesRequest {
  messageIDs: string[]
}

export interface ShareMessagesResponseSuccess {
  share_id: string
  success: true
}

export interface ShareMessagesResponseFailed {
  error: string
  success: false
}

export const shareMessages = async (data: ShareMessagesRequest) => {
  const response = await fetch('/chat/share_messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 停止生成
export interface StopRequest {
  conversationID: number
}

export interface StopResponseSuccess {
  success: true
}

export interface StopResponseFailed {
  error: string
  success: false
}

export const stopGenerate = async (data: StopRequest) => {
  const response = await fetch('/chat/stop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 语音转文字
export interface SttRequest {
  base64: string
}

export interface SttResponseSuccess {
  data: string
  success: true
}

export interface SttResponseFailed {
  error: string
  success: boolean
}

export const stt = async (data: SttRequest) => {
  const response = await fetch('/chat/stt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 获取线程列表
export interface ConversationIDMessageID {
  messageAssistantID: number
  messageUserID: number
}

export interface ThreadListResponseSuccess {
  success: true
  thread_list: {
    [key: string]: ConversationIDMessageID
  }
}

export interface ThreadListResponseFailed {
  error: string
  success: false
}

export const getThreadList = async () => {
  const response = await fetch('/chat/thread_list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 文字转语音
export interface TtsRequest {
  prompt: string
}

export interface TtsResponseSuccess {
  data: number[]
  success: true
}

export interface TtsResponseFailed {
  error: string
  success: false
}

export const tts = async (data: TtsRequest) => {
  const response = await fetch('/chat/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 获取分享内容
export interface LoadShareMessagesResponseSuccess {
  messages: Message[]
  success: true
}

export interface LoadShareMessagesResponseFailed {
  error: string
  success: false
}

export const loadShareMessages = async (shareID: string) => {
  const response = await fetch(`/chat/${shareID}`)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const responseData = await response.json()
  return {
    data: responseData
  }
}

// 重命名对话
export interface RenameConversationRequest {
  conversationID: number
  title: string
}

export interface RenameConversationResponseSuccess {
  success: true
}

export interface RenameConversationResponseFailed {
  error: string
  success: false
}

export const renameConversation = async (data: RenameConversationRequest) => {
  const response = await fetch('/chat/rename_conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const responseData = await response.json()
  return {
    data: responseData
  }
}

// WebSocket 响应类型定义
export interface WebSocketResponse<T = any> {
  type: string
  data: T
}

// WebSocket 管理器类
export class WebSocketManager {
  private static instance: WebSocketManager
  private ws: WebSocket | null = null
  // 使用 Map 存储不同类型的消息处理器，key 为响应 type
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map()
  // 存储连接成功回调处理器
  private connectedHandlers: Set<() => void> = new Set()
  private connectPromise: Promise<void> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isReconnecting = false

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  // 连接到 WebSocket（全局单连接，不需要 conversationID）
  connect(): Promise<void> {
    console.log('WebSocketManager.connect() 被调用')
    
    // 如果已经有连接且处于打开状态，直接返回
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket 已有连接且已打开')
      return Promise.resolve()
    }

    // 如果正在连接中，返回现有的连接 Promise
    if (this.connectPromise) {
      console.log('WebSocket 正在连接中，返回现有 Promise')
      return this.connectPromise
    }

    console.log('开始创建新的 WebSocket 连接...')

    // 创建连接超时计时器
    let connectTimeout: ReturnType<typeof setTimeout> | null = null

    this.connectPromise = new Promise((resolve, reject) => {
      // 如果已有连接，先关闭
      if (this.ws) {
        console.log('关闭现有 WebSocket 连接')
        this.ws.close()
      }

      // 根据页面协议选择 WebSocket 协议
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/chat/ws`
      console.log('WebSocket URL:', wsUrl, '(通过 Vite 代理到后端 5000 端口)')

      this.ws = new WebSocket(wsUrl)

      // 设置连接超时（3 秒）
      connectTimeout = setTimeout(() => {
        console.log('⏱️ WebSocket 连接超时')
        this.connectPromise = null
        reject(new Error('WebSocket 连接超时'))
      }, 3000)

      this.ws.onopen = () => {
        console.log('✅ WebSocket 连接成功 (onopen)')
        if (connectTimeout) clearTimeout(connectTimeout)

        // 停止重连机制
        this.stopReconnect()

        // 触发连接成功回调
        this.connectedHandlers.forEach(handler => handler())

        resolve()
      }

      this.ws.onerror = (error) => {
        console.log('❌ WebSocket 连接错误 (onerror):', error)
        if (connectTimeout) clearTimeout(connectTimeout)
        this.connectPromise = null
        reject(new Error('WebSocket 连接错误'))
      }

      this.ws.onclose = () => {
        console.log('🔌 WebSocket 连接关闭 (onclose)')
        if (connectTimeout) clearTimeout(connectTimeout)
        this.connectPromise = null
        
        // 触发重连机制
        this.scheduleReconnect()
      }

      this.ws.onmessage = (event) => {
        console.log('📨 WebSocket 收到消息:', event.data)
        try {
          const response: WebSocketResponse = JSON.parse(event.data)

          // 根据响应 type 调用对应的处理器
          const handlers = this.messageHandlers.get(response.type)
          if (handlers) {
            handlers.forEach(handler => handler(response.data))
          }
        } catch (error) {
          console.error('解析 WebSocket 消息失败:', error)
        }
      }
    })

    return this.connectPromise
  }

  // 定时重连机制
  private scheduleReconnect(): void {
    if (this.isReconnecting) {
      return
    }
    
    this.isReconnecting = true
    console.log('⏱️ 开始定时重连机制：每 10 秒尝试连接一次')
    
    const tryConnect = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('✅ WebSocket 已重连成功，停止定时重连')
        this.isReconnecting = false
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer)
          this.reconnectTimer = null
        }
        return
      }
      
      console.log('🔄 尝试重新连接 WebSocket...')
      this.connect().then(() => {
        // 连接成功
      }).catch((err) => {
        console.log('重连失败:', err)
      })
    }
    
    // 立即尝试一次
    tryConnect()
    
    // 每 10 秒尝试一次
    this.reconnectTimer = setInterval(tryConnect, 10000)
  }
  
  // 停止定时重连
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.isReconnecting = false
  }

  // 注册消息处理器（按响应 type 注册）
  onMessage(type: string, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set())
    }
    this.messageHandlers.get(type)!.add(handler)
  }

  // 移除消息处理器
  offMessage(type: string, handler: (data: any) => void): void {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.messageHandlers.delete(type)
      }
    }
  }

  // 移除所有指定类型的处理器
  clearMessageHandlers(type: string): void {
    this.messageHandlers.delete(type)
  }

  // 注册连接成功回调处理器
  onConnected(handler: () => void): void {
    this.connectedHandlers.add(handler)
    // 如果 WebSocket 已经连接成功，立即执行回调
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      handler()
    }
  }

  // 移除连接成功回调处理器
  offConnected(handler: () => void): void {
    this.connectedHandlers.delete(handler)
  }

  // 发送消息（简化，直接发送数据对象）
  async send(data: any): Promise<void> {
    // 如果 WebSocket 未连接，先连接
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket 未连接，等待连接建立...')
      await this.connect()
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
      console.log('WebSocket 消息已发送:', data)
    } else {
      console.error('WebSocket 仍未就绪，无法发送消息')
    }
  }

  // 关闭连接
  close(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connectPromise = null
    this.messageHandlers.clear()
    this.stopReconnect()
  }
}

// 导出单例
export const wsManager = WebSocketManager.getInstance()
