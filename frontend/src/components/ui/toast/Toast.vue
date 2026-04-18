<template>
  <div class="toast-viewport">
    <transition-group name="toast" tag="div" class="toast-stack">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast-wrapper', { 'toast-only': toasts.length === 1 }]"
      >
        <div :class="['toast-card', getToastVariantClass(toast.variant)]">
          <!-- 图标 -->
          <svg v-if="toast.variant === 'success'" class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <svg v-else-if="toast.variant === 'destructive'" class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          <svg v-else-if="toast.variant === 'info'" class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <svg v-else class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>

          <!-- 文字内容 -->
          <div class="toast-text">{{ toast.title || toast.description }}</div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { toasts } from './use-toast'
import type { Toast } from './use-toast'

const getToastVariantClass = (variant?: Toast['variant']): string => {
  switch (variant) {
    case 'destructive':
      return 'toast--error'
    case 'success':
      return 'toast--success'
    case 'info':
      return 'toast--info'
    default:
      return 'toast--default'
  }
}
</script>

<style scoped>
/* ==================== CSS 变量定义 ==================== */
.toast-viewport {
  --toast-gap: 8px;
  --toast-radius: 12px;
  --toast-padding: 10px 14px;
  
  --toast-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: var(--toast-gap);
  max-width: min(380px, calc(100vw - 32px));
}

.toast-stack {
  display: flex;
  flex-direction: column;
  gap: var(--toast-gap);
}

/* ==================== Toast Wrapper (动画层) ==================== */
.toast-wrapper {
  width: 100%;
}

/* ==================== Toast 卡片 ==================== */
.toast-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: var(--toast-padding);
  border-radius: var(--toast-radius);
  box-shadow: var(--toast-shadow);
  backdrop-filter: blur(12px);
}

.toast--success {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.25);
}

.toast--error {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.25);
}

.toast--info {
  background: rgba(245, 240, 230, 0.95);
  border-color: rgba(210, 200, 185, 0.3);
}

/* ==================== 图标 ==================== */
.toast-card .toast-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: #94a3b8;
}

.toast-card.toast--success .toast-icon {
  color: #15803d;
}

.toast-card.toast--error .toast-icon {
  color: #b91c1c;
}

.toast-card.toast--info .toast-icon {
  color: #92764d;
}

/* ==================== 文字内容 ==================== */
.toast-card .toast-text {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0;
  color: rgba(255, 255, 255, 0.9);
}

.toast-card.toast--success .toast-text {
  color: #15803d;
}

.toast-card.toast--error .toast-text {
  color: #b91c1c;
}

.toast-card.toast--info .toast-text {
  color: #6b5a3d;
}

/* ==================== 动画 ==================== */
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.21, 1.02, 0.73, 1);
}

.toast-leave-active {
  transition: opacity 0.15s ease, max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 0;
  overflow: hidden;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  opacity: 0;
}

.toast-only.toast-leave-active {
  transition: opacity 0.1s ease;
  max-height: 0;
  overflow: hidden;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  opacity: 0;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.97);
}

.toast-leave-to {
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
}

/* ==================== 响应式 ==================== */
@media (max-width: 480px) {
  .toast-viewport {
    top: 16px;
    left: 16px;
    right: 16px;
    transform: none;
    max-width: none;
  }

  .toast-card {
    --toast-padding: 9px 12px;
  }
}

/* ==================== 深色模式 ==================== */
.dark .toast-card {
  background: rgba(255, 255, 255, 0.24);
  border-color: rgba(255, 255, 255, 0.3);
}

.dark .toast-card.toast--success {
  background: rgba(34, 197, 94, 0.24);
  border-color: rgba(34, 197, 94, 0.3);
}

.dark .toast-card.toast--success .toast-icon {
  color: #4ade80;
}

.dark .toast-card.toast--success .toast-text {
  color: #4ade80;
}

.dark .toast-card.toast--error {
  background: rgba(239, 68, 68, 0.24);
  border-color: rgba(239, 68, 68, 0.3);
}

.dark .toast-card.toast--error .toast-icon {
  color: #f87171;
}

.dark .toast-card.toast--error .toast-text {
  color: #f87171;
}

.dark .toast-card.toast--info {
  background: rgba(245, 240, 230, 0.15);
  border-color: rgba(210, 200, 185, 0.25);
}

.dark .toast-card.toast--info .toast-icon {
  color: #d4c5a9;
}

.dark .toast-card.toast--info .toast-text {
  color: #e8dcc8;
}

.dark .toast-card .toast-icon {
  color: #9ca3af;
}

.dark .toast-card .toast-text {
  color: rgba(255, 255, 255, 0.85);
}
</style>
