<template>
  <div class="model-selector-container">
    <button
      @click="toggleDropdown"
      :class="['model-selector-btn', { 'model-selector-btn-disabled': !chatStore.modelsLoaded }]"
      :disabled="!chatStore.modelsLoaded"
    >
      <span class="model-selector-text">
        {{ chatStore.modelsLoaded ? selectedModelName : '加载中...' }}
      </span>
      <svg
        :class="['model-selector-icon', { 'model-selector-icon-rotated': isOpen }]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>

    <transition name="model-dropdown">
      <div
        v-if="isOpen && chatStore.modelsLoaded"
        class="model-selector-dropdown"
      >
        <div class="model-dropdown-scrollable">
          <div
            v-for="model in chatStore.sortedModels"
            :key="model.id"
            @click="selectModel(model.id)"
            class="model-selector-item"
          >
            <div class="model-selector-item-content">
              <div class="model-name">{{ model.name || '未知模型' }}</div>
              <div class="model-features">
                <span v-if="model.reasoning" class="feature-tag reasoning-tag">推理</span>
                <span v-if="model.image === 1 || model.image === 3" class="feature-tag image-tag">识图</span>
                <span class="feature-tag points-tag">{{ model.points }}积分/次</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();
const isOpen = ref(false);

// 选中的模型名称
const selectedModelName = computed(() => {
  if (!chatStore.modelsLoaded) {
    return '加载中...';
  }
  const model = chatStore.models.find(m => m.id === chatStore.selectedModel);
  return model && model.name ? model.name : '选择模型';
});

// 切换下拉菜单
const toggleDropdown = () => {
  // 只有在模型加载完成后才允许打开下拉菜单
  if (chatStore.modelsLoaded) {
    isOpen.value = !isOpen.value;
  }
};

// 选择模型
const selectModel = (id: string) => {
  chatStore.setSelectedModel(id);
  isOpen.value = false;
};

// 点击外部关闭下拉菜单
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.model-selector-container')) {
    isOpen.value = false;
  }
};

// 添加点击外部关闭事件监听
document.addEventListener('click', handleClickOutside);

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 初始化时加载模型列表
onMounted(async () => {
  if (!chatStore.modelsLoaded) {
    await chatStore.fetchModels();
  }
  // 不管是否已加载，都检查selectedModel是否有效
  if (chatStore.models.length > 0 && !chatStore.models.some(m => m.id === chatStore.selectedModel)) {
    // 如果当前选中的模型不存在，设置为第一个模型
    const firstModel = chatStore.models[0];
    if (firstModel) {
      chatStore.selectedModel = firstModel.id;
    }
  }
});

import { onUnmounted } from 'vue';
</script>

<style scoped>
.model-selector-container {
  position: relative;
  min-width: 11.25rem; /* min-w-[180px] */
}

.model-selector-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 0.75rem; /* px-3 */
  padding-right: 0.75rem; /* px-3 */
  padding-top: 0.5rem; /* py-2 */
  padding-bottom: 0.5rem; /* py-2 */
  /* border: 1px solid #d1d5db; */
  border-radius: 0.7rem;
  background-color: #f4f4f4;
  font-size: 1rem; /* text-base */
  outline: none; /* focus:outline-none */
  box-shadow: none; /* focus:ring-0 */
  color: #1f2937; /* text-gray-800 */
  cursor: pointer;
}

.model-selector-btn:hover {
  color: #1f2937; /* text-gray-800 */
}

.model-selector-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dark .model-selector-btn {
  border-color: #374151; /* dark:border-gray-700 */
  background-color: #000000; /* dark:bg-black */
  color: #e5e7eb; /* dark:text-gray-200 */
}

.dark .model-selector-btn:hover {
  color: #e5e7eb; /* dark:text-gray-200 */
}

.model-selector-text {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  text-align: left;
  color: #1f2937; /* text-gray-800 */
}

.dark .model-selector-text {
  color: #e5e7eb; /* dark:text-gray-200 */
}

.model-selector-icon {
  width: 1rem; /* w-4 */
  height: 1rem; /* h-4 */
  margin-left: 0.5rem; /* ml-2 */
  transition-duration: 200ms; /* duration-200 */
  flex-shrink: 0; /* flex-shrink-0 */
}

.model-selector-icon-rotated {
  transform: rotate(180deg); /* rotate-180 */
}

.model-selector-dropdown {
  position: absolute;
  z-index: 50; /* z-50 */
  margin-top: 0.25rem; /* mt-1 */
  width: 100%;
  background-color: #ffffff; /* bg-white */
  border: 1px solid #d1d5db; /* border border-gray-300 */
  border-radius: 0.7rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* shadow-lg */
  max-height: 20rem; /* max-h-80 */
  overflow: hidden;
  min-width: 15rem; /* min-w-[240px] */
}

/* 内部滚动容器 */
.model-dropdown-scrollable {
  max-height: 20rem;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.model-dropdown-scrollable::-webkit-scrollbar {
  width: 6px;
}

.model-dropdown-scrollable::-webkit-scrollbar-track {
  background: transparent;
}

.model-dropdown-scrollable::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.model-dropdown-scrollable::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

.dark .model-dropdown-scrollable {
  scrollbar-color: rgba(75, 85, 99, 0.5) transparent;
}

.dark .model-dropdown-scrollable::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
}

.dark .model-dropdown-scrollable::-webkit-scrollbar-thumb:hover {
  background-color: rgba(75, 85, 99, 0.7);
}

.dark .model-selector-dropdown {
  background-color: #000000; /* dark:bg-black */
  border-color: #374151; /* dark:border-gray-700 */
  scrollbar-color: #525252 #262626; /* 深色模式下指定滚动条颜色，使用灰色黑色主题 */
}

.model-selector-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem; /* p-4 */
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6; /* border-b border-gray-100 */
}

.model-selector-item:last-child {
  border-bottom: none; /* last:border-b-0 */
}

.model-selector-item:hover {
  background-color: #f3f4f6; /* hover:bg-gray-100 */
}

.dark .model-selector-item:hover {
  background-color: #1f2937; /* dark:hover:bg-gray-800 */
}

.dark .model-selector-item {
  border-bottom-color: #1f2937; /* dark:border-gray-800 */
}

.model-selector-item-content {
  flex: 1;
  min-width: 0;
}

.model-name {
  font-size: 1rem; /* text-base */
  font-weight: 500; /* font-medium */
  color: #1f2937; /* text-gray-800 */
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.dark .model-name {
  color: #e5e7eb; /* dark:text-gray-200 */
}

.model-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem; /* gap-1 */
  margin-top: 0.375rem; /* mt-1.5 */
}

.feature-tag {
  font-size: 0.75rem; /* text-xs */
  padding-left: 0.5rem; /* px-2 */
  padding-right: 0.5rem; /* px-2 */
  padding-top: 0.125rem; /* py-0.5 */
  padding-bottom: 0.125rem; /* py-0.5 */
  border-radius: 0.25rem; /* rounded */
}

.reasoning-tag {
  background-color: #dbeafe; /* bg-blue-100 */
  color: #1e40af; /* text-blue-800 */
}

.dark .reasoning-tag {
  background-color: #1e3a8a; /* dark:bg-blue-900 */
  color: #bfdbfe; /* dark:text-blue-200 */
}

.image-tag {
  background-color: #d1fae5; /* bg-green-100 */
  color: #166534; /* text-green-800 */
}

.dark .image-tag {
  background-color: #065f46; /* dark:bg-green-900 */
  color: #a7f3d0; /* dark:text-green-200 */
}

.points-tag {
  background-color: #ffface;
  color: #636363;
}

.dark .points-tag {
  background-color: #636363;
  color: #ffface;
}

/* 下拉菜单过渡动画 */
.model-dropdown-enter-active,
.model-dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.model-dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.model-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>