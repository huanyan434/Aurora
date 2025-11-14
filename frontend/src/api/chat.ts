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
