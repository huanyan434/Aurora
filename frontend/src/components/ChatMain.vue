<template>
  <div class="chat-main">
    <div class="chat-overlay">
      <div class="conversation-title"></div>
    </div>
    <div class="chat-overlay-d"></div>
    <!-- 模型选择器 -->
    <div class="model-select" ref="modelSelectContainer">
      <div class="model-select-header" @click="toggleDropdown">
        <span class="selected-model">{{ selectedModelText }}</span>
        <span class="arrow"></span>
      </div>
      <div class="model-select-options">
        <div 
          v-for="option in modelOptions" 
          :key="option.value"
          :class="['model-option', { 'selected': option.value === currentModel }]"
          @click="selectModel(option)">
          <img :src="option.icon" :alt="option.label" class="model-option-icon">
          <span>{{ option.label }}</span>
          <div class="points-usage">{{ option.cost }}积分</div>
        </div>
      </div>
    </div>
    <!-- 消息区域 -->
    <div class="scrollable">
      <div id="messages" class="messages">
        <!-- 消息内容将通过 JavaScript 动态添加 -->
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <!-- 图片预览区域 -->
      <div id="image-preview-container" class="image-preview-container" style="display: none;">
        <div class="preview-image-wrapper">
          <img id="preview-image" src="" alt="预览图片">
          <button type="button" class="remove-image-btn">×</button>
        </div>
      </div>
      <div class="message-input-wrapper">
        <textarea id="message-input" placeholder="给 Aurora 发送消息..." rows="1"></textarea>
        <div class="bottom-buttons">
          <button @click="onlineSearch()" :disabled="onlineSearchDisabled" :class="{ disabled: onlineSearchDisabled, active: onlineSearchActive }" type="button" id="online-search-btn" class="online-search-button" ref="onlineSearchBtn">
            <i class="iconfont icon-internet"></i>
            <span>联网搜索</span>
          </button>
          <button class="image-upload-button" type="button">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
            </svg>
          </button>
          <button class="send-button" type="button">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
      <input id="image-upload" type="file" accept="image/*" style="display:none" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

// 按规范命名的ref
const modelSelectContainer = ref(null);

// 模型选项（可从API获取）
const modelOptions = [
  { value: 'DeepSeek-R1', label: 'DeepSeek-R1', cost: 10, icon: '/static/models/DeepSeek.png' },
  { value: 'DeepSeek-V3', label: 'DeepSeek-V3', cost: 5, icon: '/static/models/DeepSeek.png' },
  { value: 'Doubao-1.5-Lite', label: 'Doubao-1.5-Lite', cost: 10, icon: '/static/models/Doubao.png' },
  { value: 'Doubao-1.5-Pro', label: 'Doubao-1.5-Pro', cost: 10, icon: '/static/models/Doubao.png' },
  { value: 'Doubao-1.5-Pro-256k', label: 'Doubao-1.5-Pro-256k', cost: 10, icon: '/static/models/Doubao.png' },
  { value: 'Doubao-1.5-Thinking-Pro', label: 'Doubao-1.5-Thinking-Pro', cost: 10, icon: '/static/models/Doubao.png' },
  { value: 'Gemini-2.5-Flash', label: 'Gemini-2.5-Flash', cost: 5, icon: '/static/models/Gemini.png' },
  { value: 'Gemini-2.0-Flash', label: 'Gemini-2.0-Flash', cost: 5, icon: '/static/models/Gemini.png' },
  { value: 'Qwen3', label: 'Qwen3', cost: 2, icon: '/static/models/Qwen.png' },
  { value: 'QwQ', label: 'QwQ', cost: 2, icon: '/static/models/Qwen.png' },
  { value: 'QvQ', label: 'QvQ', cost: 1, icon: '/static/models/Qwen.png' },
  { value: 'Qwen2.5-Instruct', label: 'Qwen2.5-Instruct', cost: 1, icon: '/static/models/Qwen.png' },
  { value: 'GLM-4', label: 'GLM-4', cost: 2, icon: '/static/models/Zhipu.png' },
  { value: 'GLM-Z1', label: 'GLM-Z1', cost: 5, icon: '/static/models/Zhipu.png' }
];

// 响应式状态
const currentModel = ref(localStorage.getItem('selectedModel') || 'DeepSeek-R1');

// 计算属性获取当前模型文本
const selectedModelText = computed(() => {
  const model = modelOptions.find(m => m.value === currentModel.value);
  return model ? model.label : '选择模型';
});

// 切换下拉菜单
const toggleDropdown = () => {
  modelSelectContainer.value?.classList.toggle('active');
};

// 选择模型
const selectModel = (option) => {
  currentModel.value = option.value;
  localStorage.setItem('selectedModel', option.value);
  modelSelectContainer.value?.classList.remove('active');
  console.log(`模型设置已保存: ${option.value}`);
};

// 点击外部区域关闭下拉菜单
const handleClickOutside = (event) => {
  if (modelSelectContainer.value && !modelSelectContainer.value.contains(event.target)) {
    modelSelectContainer.value.classList.remove('active');
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});
</script>