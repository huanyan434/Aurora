<template>
  <Teleport to="body">
    <div class="toast-container">
      <transition-group
        name="toast"
        tag="div"
        class="toast-wrapper"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'toast-item',
            'toast-item-' + (toast.variant || 'default')
          ]"
        >
          <div class="toast-content">
            <div class="toast-body">
              <div v-if="toast.title" class="toast-title">{{ toast.title }}</div>
              <div v-if="toast.description" class="toast-description">{{ toast.description }}</div>
            </div>
            <button @click="removeToast(toast.id)" class="toast-close">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </transition-group>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { toasts, removeToast } from './use-toast'
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
  width: 100%;
  max-width: 600px;
  padding: 0 20px;
}

.toast-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.toast-item {
  width: 100%;
  border-radius: 12px;
  padding: 16px 20px;
  border: 1px solid;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  transition: all 0.3s ease;
}

.toast-item-default {
  background: white;
  border-color: #e2e8f0;
  color: #1e293b;
}

.toast-item-destructive {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.toast-item-success {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #166534;
}

.toast-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.toast-body {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}

.toast-description {
  font-size: 14px;
  opacity: 0.9;
}

.toast-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: all 0.2s;
}

.toast-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

.toast-close svg {
  width: 16px;
  height: 16px;
}

/* 动画 */
.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: absolute;
  left: 0;
  width: 100%;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-30px) scale(0.97);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-30px) scale(0.97);
}

/* 响应式 */
@media (max-width: 640px) {
  .toast-container {
    top: 10px;
    padding: 0 12px;
    max-width: calc(100% - 24px);
  }

  .toast-item {
    padding: 12px 16px;
  }

  .toast-title {
    font-size: 14px;
  }

  .toast-description {
    font-size: 13px;
  }
}
</style>