<template>
  <div class="page-container animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">公告管理</h1>
      <p class="page-subtitle">配置前台聊天页公告弹窗内容，仅在根路由与 /c 路由展示。</p>
    </div>

    <div class="announcement-layout">
      <section class="editor-card">
        <div class="card-header">
          <div>
            <h2 class="card-title">公告编辑</h2>
            <p class="card-description">内容为空时前台不会弹出公告，启用后会按版本号控制展示。</p>
          </div>
          <span class="status-badge" :class="form.enabled ? 'status-badge-enabled' : 'status-badge-disabled'">
            {{ form.enabled ? '已启用' : '未启用' }}
          </span>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">公告标题</label>
            <input v-model="form.title" type="text" class="form-input" placeholder="请输入公告标题" />
          </div>

          <div class="form-group">
            <label class="form-label">公告版本</label>
            <input v-model="form.version" type="text" class="form-input" placeholder="例如：2026-05-01" />
          </div>

          <div class="form-group form-group-full">
            <label class="form-label">公告摘要</label>
            <textarea v-model="form.summary" class="form-textarea form-textarea-summary" placeholder="用于弹窗顶部摘要说明"></textarea>
          </div>

          <div class="form-group form-group-full">
            <label class="form-label">公告内容</label>
            <textarea v-model="form.content" class="form-textarea" placeholder="每行一条公告内容，前台会按列表展示"></textarea>
            <p class="form-hint">按换行分隔多条公告内容。</p>
          </div>
        </div>

        <div class="card-footer">
          <label class="switch-row">
            <input v-model="form.enabled" type="checkbox" class="switch-input" />
            <span class="switch-slider"></span>
            <span class="switch-text">启用前台公告</span>
          </label>

          <button class="save-btn" :disabled="saving" @click="saveAnnouncement">
            {{ saving ? '保存中...' : '保存公告' }}
          </button>
        </div>
      </section>

      <section class="preview-card">
        <div class="card-header">
          <div>
            <h2 class="card-title">前台预览</h2>
            <p class="card-description">直接复用前台公告弹窗的布局，仅展示当前配置的效果。</p>
          </div>
          <span class="preview-version">{{ form.version || '未设置版本' }}</span>
        </div>

        <div class="announcement-dialog-content">
          <div class="announcement-dialog-header">
            <div class="announcement-dialog-badge">
              <BellRing class="announcement-dialog-badge-icon" />
              <span>系统公告</span>
            </div>
            <DialogTitle class="announcement-dialog-title">
              {{ form.title || '暂无公告标题' }}
            </DialogTitle>
            <DialogDescription class="announcement-dialog-description">
              {{ form.summary || '暂无公告摘要' }}
            </DialogDescription>
          </div>

          <div class="announcement-dialog-body">
            <ul v-if="previewItems.length > 0" class="announcement-dialog-list">
              <li
                v-for="item in previewItems"
                :key="item"
                class="announcement-dialog-list-item"
              >
                <span class="announcement-dialog-list-dot"></span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>

        <p v-if="lastUpdatedAt" class="updated-at">最近保存：{{ lastUpdatedAt }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BellRing } from 'lucide-vue-next'
import { dashboardApi } from '@/api/dashboard'
import { addToast } from '@/components/ui/toast/use-toast'

const loading = ref(false)
const saving = ref(false)
const lastUpdatedAt = ref('')

const form = ref({
  title: '',
  summary: '',
  content: '',
  enabled: false,
  version: ''
})

const previewItems = computed(() => {
  return form.value.content
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
})

const loadAnnouncement = async () => {
  try {
    loading.value = true
    const response = await dashboardApi.getAnnouncement()
    const data = response.data.data

    form.value = {
      title: data?.title || '',
      summary: data?.summary || '',
      content: data?.content || '',
      enabled: Boolean(data?.enabled),
      version: data?.version || ''
    }
    lastUpdatedAt.value = data?.updatedAt || ''
  } catch (error) {
    console.error('加载公告失败:', error)
    addToast({
      title: '加载失败',
      description: '公告配置加载失败，请稍后重试',
      variant: 'destructive',
      duration: 3000
    })
  } finally {
    loading.value = false
  }
}

const saveAnnouncement = async () => {
  try {
    saving.value = true
    const response = await dashboardApi.updateAnnouncement({
      title: form.value.title.trim(),
      summary: form.value.summary.trim(),
      content: form.value.content,
      enabled: form.value.enabled,
      version: form.value.version.trim(),
    })

    lastUpdatedAt.value = response.data.data.updatedAt || ''

    addToast({
      title: '保存成功',
      description: '公告配置已更新',
      duration: 2500
    })
  } catch (error) {
    console.error('保存公告失败:', error)
    addToast({
      title: '保存失败',
      description: '公告配置保存失败，请稍后重试',
      variant: 'destructive',
      duration: 3000
    })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadAnnouncement()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
}

.announcement-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.9fr);
  gap: 24px;
}

.editor-card,
.preview-card {
  background: var(--card-bg);
  border-radius: 20px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  padding: 28px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.card-description {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.status-badge,
.preview-version {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
}

.status-badge-enabled {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.status-badge-disabled {
  background: rgba(148, 163, 184, 0.16);
  color: #475569;
}

.preview-version {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group-full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-input,
.form-textarea {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: #ffffff;
  padding: 14px 16px;
  font-size: 14px;
  color: var(--text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.form-textarea {
  min-height: 200px;
  resize: vertical;
  line-height: 1.7;
}

.form-textarea-summary {
  min-height: 110px;
}

.form-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.card-footer {
  margin-top: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.switch-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.switch-input {
  display: none;
}

.switch-slider {
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: 9999px;
  background: #cbd5e1;
  transition: background 0.2s;
}

.switch-slider::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
  transition: transform 0.2s;
}

.switch-input:checked + .switch-slider {
  background: #2563eb;
}

.switch-input:checked + .switch-slider::after {
  transform: translateX(20px);
}

.switch-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.save-btn {
  min-width: 132px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
  color: #ffffff;
  padding: 12px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
}

.save-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.preview-panel {
  display: none;
}

.announcement-dialog-content {
  max-width: 32rem;
  border-color: rgba(147, 197, 253, 0.42);
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.98) 0%, rgba(255, 255, 255, 0.99) 100%);
  box-shadow: 0 24px 60px -24px rgba(37, 99, 235, 0.42);
  border-radius: 1.25rem;
  padding: 1.5rem;
}

.announcement-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.announcement-dialog-badge {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 0.5rem;
  border-radius: 9999px;
  background: rgba(37, 99, 235, 0.12);
  padding: 0.375rem 0.875rem;
  color: #1d4ed8;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.announcement-dialog-badge-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.announcement-dialog-title {
  color: #0f172a;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
}

.announcement-dialog-description {
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.7;
}

.announcement-dialog-body {
  margin-top: 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(191, 219, 254, 0.75);
  background: rgba(255, 255, 255, 0.82);
  padding: 1rem;
}

.announcement-dialog-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.announcement-dialog-list-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: #1e293b;
  font-size: 0.925rem;
  line-height: 1.7;
}

.announcement-dialog-list-dot {
  width: 0.5rem;
  height: 0.5rem;
  margin-top: 0.5rem;
  flex-shrink: 0;
  border-radius: 9999px;
  background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.14);
}

.announcement-dialog-footer {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.announcement-dialog-secondary,
.announcement-dialog-primary {
  flex: 1;
  min-height: 42px;
  border-radius: 0.875rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.announcement-dialog-secondary {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
}

.announcement-dialog-primary {
  border: 1px solid #1d4ed8;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
}

.dark .announcement-dialog-content {
  border-color: rgba(96, 165, 250, 0.28);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(2, 6, 23, 0.98) 100%);
  box-shadow: 0 24px 60px -24px rgba(15, 23, 42, 0.88);
}

.dark .announcement-dialog-badge {
  background: rgba(59, 130, 246, 0.18);
  color: #93c5fd;
}

.dark .announcement-dialog-title {
  color: #eff6ff;
}

.dark .announcement-dialog-description {
  color: #cbd5e1;
}

.dark .announcement-dialog-body {
  border-color: rgba(59, 130, 246, 0.2);
  background: rgba(15, 23, 42, 0.72);
}

.dark .announcement-dialog-list-item {
  color: #e2e8f0;
}

.dark .announcement-dialog-secondary {
  border-color: #475569;
  background: #0f172a;
  color: #e2e8f0;
}

.updated-at {
  margin-top: 16px;
  color: var(--text-muted);
  font-size: 13px;
}

@media (max-width: 1080px) {
  .announcement-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .editor-card,
  .preview-card {
    padding: 20px;
  }

  .card-header,
  .card-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .save-btn {
    width: 100%;
  }
}
</style>
