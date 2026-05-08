<template>
  <div class="topbar-container">
    <!-- 折叠按钮 -->
    <Button v-if="sidebarStore.collapsed" variant="ghost" size="icon" class="toggle-btn" @click="toggleSidebar">
      <PanelLeftOpen class="toggle-btn-icon" />
    </Button>

    <!-- 模型选择器 -->
    <ModelSelector />

    <!-- Settings 按钮 -->
    <Button variant="ghost" size="icon" class="settings-btn" @click="openSettings">
      <Settings class="settings-btn-icon" />
    </Button>
  </div>

  <!-- Settings 弹窗 -->
  <Dialog :open="isSettingsOpen" @update:open="isSettingsOpen = $event">
    <DialogContent class="settings-dialog">
      <DialogHeader>
        <DialogTitle>模型参数设置</DialogTitle>
        <DialogDescription>
          调整模型生成参数以获得不同的输出效果
        </DialogDescription>
      </DialogHeader>
      <div class="settings-content">
        <!-- 温度 (仅非生图模型) -->
        <div v-if="!isImageModel" class="setting-item">
          <Label for="temperature">Temperature (0.0 - 2.0)</Label>
          <Input id="temperature" v-model="settings.temperature" type="number" step="0.1" min="0" max="2" />
          <p class="setting-description">控制输出的随机性。值越高，输出越随机。</p>
        </div>

        <!-- Top P (仅非生图模型) -->
        <div v-if="!isImageModel" class="setting-item">
          <Label for="topP">Top P (0.0 - 1.0)</Label>
          <Input id="topP" v-model="settings.topP" type="number" step="0.1" min="0" max="1" />
          <p class="setting-description">控制核采样。值越低，输出越确定。</p>
        </div>

        <!-- Frequency Penalty (仅非生图模型) -->
        <div v-if="!isImageModel" class="setting-item">
          <Label for="frequencyPenalty">Frequency Penalty (-2.0 - 2.0)</Label>
          <Input id="frequencyPenalty" v-model="settings.frequencyPenalty" type="number" step="0.1" min="-2" max="2" />
          <p class="setting-description">减少重复词汇的使用。</p>
        </div>

        <!-- Presence Penalty (仅非生图模型) -->
        <div v-if="!isImageModel" class="setting-item">
          <Label for="presencePenalty">Presence Penalty (-2.0 - 2.0)</Label>
          <Input id="presencePenalty" v-model="settings.presencePenalty" type="number" step="0.1" min="-2" max="2" />
          <p class="setting-description">鼓励模型讨论新话题。</p>
        </div>

        <!-- Size (仅生图模型) -->
        <div v-if="isImageModel" class="setting-item">
          <Label for="size">图片尺寸</Label>
          <Select v-model="settings.size">
            <SelectTrigger class="select-trigger">
              <SelectValue placeholder="选择图片尺寸" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="sizeOption in availableSizes" :key="sizeOption.value" :value="sizeOption.value">
                {{ sizeOption.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="setting-description">选择生成图片的尺寸。</p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="closeSettings">取消</Button>
        <Button @click="saveSettings" class="primary-button">保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, PanelLeftOpen } from 'lucide-vue-next';
import { useSidebarStore } from '@/stores/sidebar';
import { useUserStore } from '@/stores/user';
import ModelSelector from './ModelSelector.vue';
import { useChatStore } from '@/stores/chat';
import { toastError } from '@/components/ui/toast/use-toast';

defineEmits(['openSettings']);

const sidebarStore = useSidebarStore();
const chatStore = useChatStore();
const userStore = useUserStore();

// Settings 弹窗状态
const isSettingsOpen = ref(false);

// 模型参数设置
const settings = ref({
  temperature: 0.7,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  size: '1024x1024'
});

// 打开 Settings 弹窗
const openSettings = () => {
  // 每次打开时，从 store 加载最新的设置
  settings.value = { ...chatStore.modelParameters };
  isSettingsOpen.value = true;
};

// 关闭 Settings 弹窗
const closeSettings = () => {
  isSettingsOpen.value = false;
};

// 保存设置
const saveSettings = () => {
  // 参数校验
  if (!validateSettings()) {
    return;
  }
  
  // 保存设置到 store
  chatStore.setModelParameters({ ...settings.value });
  
  closeSettings();
};

// 参数校验
const validateSettings = () => {
  const s = settings.value;
  
  // 检查温度
  if (isNaN(s.temperature) || s.temperature < 0 || s.temperature > 2) {
    toastError('Temperature 必须是 0.0 到 2.0 之间的数字');
    return false;
  }
  
  // 检查 Top P
  if (isNaN(s.topP) || s.topP < 0 || s.topP > 1) {
    toastError('Top P 必须是 0.0 到 1.0 之间的数字');
    return false;
  }
  
  // 检查 Frequency Penalty
  if (isNaN(s.frequencyPenalty) || s.frequencyPenalty < -2 || s.frequencyPenalty > 2) {
    toastError('Frequency Penalty 必须是 -2.0 到 2.0 之间的数字');
    return false;
  }
  
  // 检查 Presence Penalty
  if (isNaN(s.presencePenalty) || s.presencePenalty < -2 || s.presencePenalty > 2) {
    toastError('Presence Penalty 必须是 -2.0 到 2.0 之间的数字');
    return false;
  }
  
  // 检查图片尺寸权限
  if (isImageModel.value) {
    const size = s.size;
    // SVIP 可以使用所有尺寸
    if (isSVIP.value) {
      const validSizes = ['1024x1024', '1536x1024', '1024x1536', '2048x2048', '1152x2048', '2048x1152', '3840x2160', '2160x3840'];
      if (!validSizes.includes(size)) {
        toastError('无效的图片尺寸');
        return false;
      }
    }
    // VIP 可以使用前六个尺寸
    else if (isVIP.value) {
      const validSizes = ['1024x1024', '1536x1024', '1024x1536', '2048x2048', '1152x2048', '2048x1152'];
      if (!validSizes.includes(size)) {
        toastError('VIP 用户只能使用 2K 以内尺寸');
        return false;
      }
    }
    // 普通用户只能使用基础尺寸
    else {
      const validSizes = ['1024x1024', '1536x1024', '1024x1536'];
      if (!validSizes.includes(size)) {
        toastError('普通用户只能使用基础尺寸');
        return false;
      }
    }
  }
  
  return true;
};

// 切换侧边栏
const toggleSidebar = () => {
  sidebarStore.toggleSidebar();
};

// 计算属性：当前选中的模型
const currentModel = computed(() => {
  const modelList = chatStore.models;
  const selectedModelId = chatStore.selectedModel;
  return modelList.find(model => model.id === selectedModelId);
});

// 计算属性：是否为生图模型
const isImageModel = computed(() => {
  if (!currentModel.value) return false;
  const imageCapability = currentModel.value.image;
  return imageCapability === 2 || imageCapability === 3;
});

// 计算属性：用户权限
const isVIP = computed(() => {
  return userStore.userInfo.memberLevel === 'VIP';
});

const isSVIP = computed(() => {
  return userStore.userInfo.memberLevel === 'SVIP';
});

// 计算属性：可用的图片尺寸选项
const availableSizes = computed(() => {
  if (isSVIP.value) {
    return [
      { value: '1024x1024', label: '1024x1024' },
      { value: '1536x1024', label: '1536x1024' },
      { value: '1024x1536', label: '1024x1536' },
      { value: '2048x2048', label: '2048x2048' },
      { value: '2048x1152', label: '2048x1152' },
      { value: '1152x2048', label: '1152x2048' },
      { value: '3840x2160', label: '3840x2160 (4K)' },
      { value: '2160x3840', label: '2160x3840 (4K)' }
    ];
  } else if (isVIP.value) {
    return [
      { value: '1024x1024', label: '1024x1024' },
      { value: '1536x1024', label: '1536x1024' },
      { value: '1024x1536', label: '1024x1536' },
      { value: '2048x2048', label: '2048x2048' },
      { value: '2048x1152', label: '2048x1152' },
      { value: '1152x2048', label: '1152x2048' }
    ];
  } else {
    return [
      { value: '1024x1024', label: '1024x1024' },
      { value: '1536x1024', label: '1536x1024' },
      { value: '1024x1536', label: '1024x1536' }
    ];
  }
});

// 监听用户权限变化，如果用户不再有权限使用当前尺寸，则重置为默认尺寸
watch([isVIP, isSVIP], () => {
  if (isSettingsOpen.value && isImageModel.value) {
    const currentSize = settings.value.size;
    const isValidSize = availableSizes.value.some(size => size.value === currentSize);
    
    if (!isValidSize) {
      // 重置为默认尺寸
      settings.value.size = '1024x1024';
    }
  }
});
</script>

<style scoped>
.topbar-container {
  display: flex;
  align-items: center;
  padding-left: var(--spacing-lg);
  padding-right: var(--spacing-lg);
  padding-top: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  background-color: #ffffff;
}

.dark .topbar-container {
  background-color: #0f0f0f;
}

.toggle-btn {
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-md);
  margin-right: var(--spacing-sm);
  color: #6B7280;
  cursor: pointer;
  width: 2rem;
  height: 2rem;
}

.toggle-btn:hover {
  background-color: #E5E7EB;
}

.dark .toggle-btn:hover {
  background-color: #374151;
}

.dark .toggle-btn {
  color: #9CA3AF;
}

.toggle-btn-icon {
  height: 1.5rem;
  width: 1.5rem;
}

.settings-btn {
  margin-left: auto;
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-md);
  color: #6B7280;
  cursor: pointer;
  width: 2rem;
  height: 2rem;
}

.settings-btn:hover {
  background-color: #E5E7EB;
}

.dark .settings-btn:hover {
  background-color: #374151;
}

.dark .settings-btn {
  color: #9CA3AF;
}

.settings-btn-icon {
  height: 1.5rem;
  width: 1.5rem;
}

.settings-dialog {
  max-width: 500px;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-description {
  font-size: 0.875rem;
  color: #6B7280;
}

.dark .setting-description {
  color: #9CA3AF;
}

/* Primary button styles */
.primary-button {
  background-color: var(--color-primary);
  color: white;
  border: none;
}

.primary-button:hover {
  background-color: var(--color-primary-hover);
}

.select-trigger {
  width: 100%;
}
</style>