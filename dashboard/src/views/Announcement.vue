<template>
  <div class="page-container animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">系统公告</h1>
      <p class="page-subtitle">仅保留一条系统公告，前台按 Markdown 渲染。</p>
    </div>

    <section class="editor-card">
      <div class="card-header">
        <div>
          <h2 class="card-title">系统公告编辑</h2>
          <p class="card-description">保存后会立即同步到前台公告弹窗。</p>
        </div>
        <span class="status-badge" :class="form.enabled ? 'status-badge-enabled' : 'status-badge-disabled'">
          {{ form.enabled ? '已启用' : '未启用' }}
        </span>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">公告版本</label>
          <input v-model="form.version" type="text" class="form-input" placeholder="例如：2026-05-01" />
        </div>

        <div class="form-group form-group-full">
          <label class="form-label">公告内容</label>
          <textarea v-model="form.content" class="form-textarea form-textarea-summary" placeholder="支持 Markdown 格式"></textarea>
        </div>
      </div>

      <div class="card-footer">
        <label class="switch-row">
          <input v-model="form.enabled" type="checkbox" class="switch-input" />
          <span class="switch-slider"></span>
          <span class="switch-text">启用前台系统公告</span>
        </label>

        <button class="save-btn" :disabled="saving" @click="saveAnnouncement">
          {{ saving ? '保存中...' : '保存系统公告' }}
        </button>
      </div>
    </section>

    <section class="preview-card">
      <div class="card-header">
        <div>
          <h2 class="card-title">预览</h2>
          <p class="card-description">直接预览前台系统公告的 Markdown 渲染效果。</p>
        </div>
        <span class="preview-version">{{ form.version || '未设置版本' }}</span>
      </div>

      <div class="announcement-preview markdown-body" v-html="renderedContent"></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { dashboardApi } from '@/api/dashboard'
import { marked } from 'marked'

marked.setOptions({
  breaks: true,
})

const saving = ref(false)
const form = ref({
  content: '',
  enabled: true,
  version: '',
})

const renderedContent = computed(() => {
  const content = form.value.content || ''
  return content ? marked.parse(content) : '暂无公告内容'
})

const loadAnnouncement = async () => {
  const res = await dashboardApi.getAnnouncement()
  if (res.data?.data) {
    form.value = {
      content: res.data.data.content || '',
      enabled: !!res.data.data.enabled,
      version: res.data.data.version || '',
    }
  }
}

const saveAnnouncement = async () => {
  saving.value = true
  try {
    await dashboardApi.updateAnnouncement({
      summary: '',
      content: form.value.content,
      enabled: form.value.enabled,
      version: form.value.version,
    })
    await loadAnnouncement()
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadAnnouncement()
})
</script>

<style scoped>
:global(:root) {
  --dashboard-primary: #2563eb;
  --dashboard-primary-hover: #1d4ed8;
}

.page-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.editor-card,
.preview-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 1.25rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  box-shadow: 0 18px 40px -28px rgba(15, 23, 42, 0.28);
  padding: 1.25rem;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.card-description {
  margin: 0.4rem 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
}

.status-badge,
.preview-version {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid transparent;
}

.status-badge-enabled {
  background: rgba(37, 99, 235, 0.12);
  color: var(--dashboard-primary);
  border-color: rgba(37, 99, 235, 0.18);
}

.status-badge-disabled {
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-secondary);
  border-color: rgba(148, 163, 184, 0.18);
}

.preview-version {
  background: rgba(37, 99, 235, 0.08);
  color: var(--dashboard-primary);
  border-color: rgba(37, 99, 235, 0.16);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.form-group-full {
  grid-column: 1 / -1;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.form-input,
.form-textarea {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 0.875rem;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  padding: 0.85rem 1rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.form-textarea {
  min-height: 12rem;
  resize: vertical;
}

.form-textarea-summary {
  min-height: 16rem;
}

.form-input:focus,
.form-textarea:focus {
  border-color: var(--dashboard-primary);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.form-hint {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.card-footer {
  margin-top: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.switch-row {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
}

.save-btn {
  min-width: 8.5rem;
  border: none;
  border-radius: 0.875rem;
  padding: 0.85rem 1.2rem;
  background: var(--dashboard-primary);
  color: white;
  cursor: pointer;
}

.save-btn:hover:not(:disabled) {
  background: var(--dashboard-primary-hover);
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background: var(--dashboard-primary);
}

.announcement-preview {
  min-height: 12rem;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.72);
}

.markdown-body {
  color: var(--text-primary);
  line-height: 1.8;
  white-space: normal;
}

.markdown-body :deep(p) {
  margin: 0 0 0.8rem;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 1rem 0 0.75rem;
  line-height: 1.35;
}

.markdown-body :deep(code) {
  padding: 0.15rem 0.35rem;
  border-radius: 0.35rem;
  background: rgba(37, 99, 235, 0.08);
  color: var(--dashboard-primary);
}

.dark .editor-card,
.dark .preview-card {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(2, 6, 23, 0.98) 100%);
  border-color: rgba(148, 163, 184, 0.14);
  box-shadow: 0 18px 40px -28px rgba(2, 6, 23, 0.9);
}

.dark .form-input,
.dark .form-textarea,
.dark .announcement-preview {
  background: rgba(15, 23, 42, 0.72);
  border-color: rgba(148, 163, 184, 0.18);
  color: #e2e8f0;
}

.dark .card-title,
.dark .form-label,
.dark .switch-row,
.dark .markdown-body {
  color: #e2e8f0;
}

.dark .card-description,
.dark .form-hint {
  color: #94a3b8;
}

.dark .status-badge-disabled,
.dark .preview-version {
  background: rgba(148, 163, 184, 0.12);
  color: #cbd5e1;
}

@media (max-width: 960px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .card-header,
  .card-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .save-btn {
    width: 100%;
  }
}
</style>
