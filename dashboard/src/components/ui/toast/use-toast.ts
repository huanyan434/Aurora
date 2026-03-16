import { ref } from 'vue'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

export const toasts = ref<Toast[]>([])

// 添加toast
export const addToast = (toast: Omit<Toast, 'id'>) => {
  const id = Math.random().toString(36).substring(2, 9)
  const newToast = {
    ...toast,
    id
  }
  toasts.value.push(newToast)

  // 如果设置了持续时间，则自动移除 toast
  if (toast.duration !== 0) {
    const duration = toast.duration || 5000
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
}

// 移除toast
export const removeToast = (id: string) => {
  toasts.value = toasts.value.filter(toast => toast.id !== id)
}

// 便捷函数
export const toastSuccess = (message: string) => {
  addToast({
    title: '成功',
    description: message,
    variant: 'success',
    duration: 3000
  })
}

export const toastError = (message: string) => {
  addToast({
    title: '错误',
    description: message,
    variant: 'destructive',
    duration: 3000
  })
}

// 创建一个用于全局初始化toast功能的函数
export const initToast = () => {
  // 这里可以进行任何必要的初始化
}