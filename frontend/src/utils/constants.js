/**
 * 应用常量定义
 */

// 本地存储键名
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language'
}

// 消息类型
export const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
}

// 对话状态
export const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted'
}

// 生成状态
export const GENERATION_STATUS = {
  IDLE: 'idle',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  ERROR: 'error',
  STOPPED: 'stopped'
}

// 用户角色
export const USER_ROLES = {
  USER: 'user',
  VIP: 'vip',
  ADMIN: 'admin'
}

// 响应式断点
export const BREAKPOINTS = {
  XS: 480,
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  XXL: 1536
}

// 主题配置
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
}

// 语言配置
export const LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US'
}

// API错误码
export const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  NETWORK_ERROR: 'NETWORK_ERROR'
}

// 文件类型
export const FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  AUDIO: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
  VIDEO: ['mp4', 'avi', 'mov', 'wmv', 'flv'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'rtf']
}

// 最大文件大小 (字节)
export const MAX_FILE_SIZES = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  AUDIO: 50 * 1024 * 1024, // 50MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  DOCUMENT: 20 * 1024 * 1024 // 20MB
}