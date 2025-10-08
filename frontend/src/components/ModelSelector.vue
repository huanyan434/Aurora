<template>
  <div class="model-selection-header">
    <div class="model-selection-wrapper">
      <div class="model-info">
        <!-- 自定义模型选择下拉框 -->
        <div class="aurora-model-select" @click="toggleModelDropdown">
          <div class="selected-model">
            <span class="model-name">{{ selectedModelName }}</span>
            <n-icon class="dropdown-icon" :class="{ rotated: showModelDropdown }">
              <ChevronDown />
            </n-icon>
          </div>
        </div>

        <!-- 下拉列表 -->
        <div v-if="showModelDropdown" class="model-dropdown" v-click-outside="closeModelDropdown">
          <div
              v-for="model in sortedModels"
              :key="model.id"
              class="model-option"
              @click="selectModel(model.id)"
          >
            <div class="model-main-info">
              <span class="model-name">{{ model.name }}</span>
            </div>
            <div class="model-extra-info">
              <!-- 推理能力 -->
              <span v-if="model.reasoning" class="model-capability reasoning">推理</span>
              <!-- 识图能力 -->
              <span v-if="model.image === 1 || model.image === 3" class="model-capability image">识图</span>
              <!-- 积分消耗 -->
              <span v-if="model.points > 0" class="model-points">{{ model.points }}积分/次</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NIcon } from 'naive-ui'
import { ChevronDown } from '@vicons/tabler'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const showModelDropdown = defineModel('showModelDropdown', { default: false })

// 点击外部指令
const vClickOutside = {
  beforeMount(el, binding) {
    el.clickOutsideEvent = function(event) {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.body.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.clickOutsideEvent)
  }
}

// 模型选项
const models = computed(() => chatStore.models)

// 按首字母顺序排序的模型列表
const sortedModels = computed(() => {
  return [...models.value].sort((a, b) => {
    return a.name.localeCompare(b.name, 'zh-CN')
  })
})

// 选中的模型名称
const selectedModelName = computed(() => {
  const model = chatStore.models.find(m => m.id === chatStore.selectedModel)
  return model ? model.name : '选择模型'
})

/**
 * 切换模型下拉框显示状态
 */
const toggleModelDropdown = (event) => {
  // 阻止事件冒泡
  event.stopPropagation()
  showModelDropdown.value = !showModelDropdown.value
}

/**
 * 关闭模型下拉框
 */
const closeModelDropdown = () => {
  showModelDropdown.value = false
}

/**
 * 选择模型
 */
const selectModel = (modelId) => {
  chatStore.selectedModel = modelId
  // 保存选中的模型到 localStorage
  localStorage.setItem('selectedModel', modelId)
  closeModelDropdown()
}

defineExpose({
  toggleModelDropdown,
  closeModelDropdown
})
</script>

<style scoped>
.model-selection-header {
  display: flex;
  align-items: center;
  padding-left: 20px;
  background-color: #fafafa;
  border-radius: 0 0 20px 20px;
  height: 80px;
  position: relative;
}

.model-selection-wrapper {
  width: 100%;
  margin: 0 auto;
}

.model-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

/* 自定义模型选择下拉框 */
.aurora-model-select {
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  background-color: transparent;
  transition: background-color 0.2s;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100; /* 确保在下拉列表之上 */
}

.aurora-model-select:hover {
  background-color: #f0f0f0;
}

.selected-model {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.model-name {
  font-size: 14px;
  color: #333;
  flex-grow: 1;
  text-align: left;
}

.dropdown-icon {
  transition: transform 0.3s ease;
  color: #666;
  margin-left: 8px;
}

.dropdown-icon.rotated {
  transform: rotate(180deg);
}

/* 模型下拉列表 */
.model-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 300px;
  max-height: 300px;
  overflow-y: auto;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 99;
  margin-top: 4px;
}

.model-option {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.model-option:last-child {
  border-bottom: none;
}

.model-option:hover {
  background-color: #f5f5f5;
}

.model-main-info {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.model-main-info .model-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.model-extra-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.model-capability {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
}

.model-capability.reasoning {
  background-color: #409eff;
}

.model-capability.image {
  background-color: #67c23a;
}

.model-points {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f0f0f0;
  color: #666;
}

@media (max-width: 768px) {
  .model-selection-header {
    padding-left: 134px;
  }

  .model-dropdown {
    width: 200px;
  }
}
</style>