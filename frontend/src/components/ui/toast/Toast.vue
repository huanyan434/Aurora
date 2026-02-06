<template>
  <div class="fixed top-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-start gap-2 pointer-events-none z-[2000]">
    <transition-group
      name="toast"
      tag="div"
      class="flex flex-col gap-2"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'min-w-sm rounded-md border p-4 shadow-lg transition-all',
          'pointer-events-auto',
          toast.variant === 'destructive' 
            ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-900/30 dark:text-red-50' 
            : 'border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50'
        ]"
      >
        <div class="flex items-start gap-3">
          <div class="flex-1">
            <div 
              v-if="toast.title"
              :class="[
                'font-semibold text-sm',
                toast.variant === 'destructive' 
                  ? 'text-red-800 dark:text-red-200' 
                  : 'text-gray-900 dark:text-gray-100'
              ]"
            >
              {{ toast.title }}
            </div>
            <div 
              v-if="toast.description"
              :class="[
                'text-sm mt-1',
                toast.variant === 'destructive' 
                  ? 'text-red-700 dark:text-red-300' 
                  : 'text-gray-700 dark:text-gray-400'
              ]"
            >
              {{ toast.description }}
            </div>
          </div>
          <button
            @click="removeToast(toast.id)"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { toasts, removeToast } from './use-toast'
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  position: absolute;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>