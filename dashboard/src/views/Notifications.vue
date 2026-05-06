<template>
  <div class="page-container animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">通知管理</h1>
      <p class="page-subtitle">通知独立管理，可新增、编辑、删除，前台按创建时间从新到旧显示。</p>
    </div>

    <section class="editor-card">
      <div class="card-header">
        <div>
          <h2 class="card-title">通知编辑</h2>
          <p class="card-description">每条通知都是独立记录，保存后会自动分配雪花 ID。</p>
        </div>
        <button class="save-btn" @click="startCreate">新增通知</button>
      </div>

      <div v-if="editing" class="form-grid">
        <div class="form-group">
          <label class="form-label">通知内容</label>
          <textarea v-model="editing.content" class="form-textarea" placeholder="请输入通知内容"></textarea>
        </div>

        <div class="card-footer form-group-full">
          <button class="save-btn" :disabled="saving" @click="saveNotification">
            {{ saving ? '保存中...' : (editing.id ? '保存修改' : '创建通知') }}
          </button>
          <button class="cancel-btn" @click="cancelEdit">取消</button>
        </div>
      </div>
    </section>

    <section class="editor-card notification-list-card">
      <div class="card-header">
        <div>
          <h2 class="card-title">通知列表</h2>
          <p class="card-description">前台按时间从新到旧展示，单条通知显示内容和创建时间。</p>
        </div>
      </div>

      <div v-if="notifications.length > 0" class="notification-list">
        <div v-for="item in notifications" :key="item.id" class="notification-item">
          <div class="notification-item-content">
            <div class="notification-item-text">{{ item.content }}</div>
            <div class="notification-item-time">{{ formatDate(item.createdAt) }}</div>
          </div>
          <div class="notification-item-actions">
            <button class="action-btn" @click="editItem(item)">编辑</button>
            <button class="action-btn danger" @click="removeItem(item.id)">删除</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">暂无通知</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { dashboardApi } from '@/api/dashboard'

const notifications = ref<Array<{ id: string; title: string; content: string; createdAt: string; updatedAt: string }>>([])
const saving = ref(false)
const editing = ref<{ id?: string; content: string } | null>(null)

const loadNotifications = async () => {
  const res = await dashboardApi.getNotifications()
  notifications.value = res.data?.data || []
}

const startCreate = () => {
  editing.value = { content: '' }
}

const editItem = (item: { id: string; content: string }) => {
  editing.value = { id: item.id, content: item.content }
}

const cancelEdit = () => {
  editing.value = null
}

const saveNotification = async () => {
  if (!editing.value) return
  saving.value = true
  try {
    if (editing.value.id) {
      await dashboardApi.updateNotification(editing.value.id, { title: '', content: editing.value.content })
    } else {
      await dashboardApi.createNotification({ title: '', content: editing.value.content })
    }
    editing.value = null
    await loadNotifications()
  } finally {
    saving.value = false
  }
}

const removeItem = async (id: string) => {
  await dashboardApi.deleteNotification(id)
  await loadNotifications()
}

const formatDate = (value: string) => new Date(value).toLocaleString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})

onMounted(() => {
  void loadNotifications()
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
.notification-list-card {
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

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
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

.form-textarea {
  width: 100%;
  min-height: 12rem;
  resize: vertical;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 0.875rem;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  padding: 0.85rem 1rem;
  outline: none;
}

.form-textarea:focus {
  border-color: var(--dashboard-primary);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.card-footer {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}

.save-btn,
.cancel-btn,
.action-btn {
  min-width: 6.5rem;
  border: none;
  border-radius: 0.875rem;
  padding: 0.85rem 1rem;
  cursor: pointer;
}

.save-btn {
  background: var(--dashboard-primary);
  color: white;
  box-shadow: 0 12px 24px -18px rgba(37, 99, 235, 0.65);
}

.save-btn:hover:not(:disabled) {
  background: var(--dashboard-primary-hover);
}

.cancel-btn {
  background: rgba(148, 163, 184, 0.12);
  color: var(--text-primary);
  border: 1px solid rgba(148, 163, 184, 0.18);
}


.action-btn {
  background: rgba(37, 99, 235, 0.08);
  color: var(--dashboard-primary);
  border: 1px solid rgba(37, 99, 235, 0.16);
}

.action-btn.danger {
  background: rgba(220, 38, 38, 0.08);
  color: var(--color-red-600);
  border-color: rgba(220, 38, 38, 0.16);
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-height: 32rem;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.notification-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.05rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 12px 28px -24px rgba(15, 23, 42, 0.22);
}

.notification-item-content {
  flex: 1;
  min-width: 0;
}

.notification-item-text {
  white-space: pre-wrap;
  color: var(--text-primary);
  line-height: 1.75;
}

.notification-item-time {
  margin-top: 0.45rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.notification-item-actions {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex-shrink: 0;
}

.empty-state {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-secondary);
  border: 1px dashed rgba(148, 163, 184, 0.25);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.55);
}

.dark .editor-card,
.dark .notification-list-card {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(2, 6, 23, 0.98) 100%);
  border-color: rgba(148, 163, 184, 0.14);
  box-shadow: 0 18px 40px -28px rgba(2, 6, 23, 0.9);
}

.dark .form-textarea,
.dark .notification-item,
.dark .empty-state {
  background: rgba(15, 23, 42, 0.72);
  border-color: rgba(148, 163, 184, 0.18);
  color: #e2e8f0;
}

.dark .card-title,
.dark .form-label,
.dark .notification-item-text {
  color: #e2e8f0;
}

.dark .card-description,
.dark .notification-item-time,
.dark .empty-state {
  color: #94a3b8;
}

@media (max-width: 960px) {
  .card-header,
  .card-footer,
  .notification-item {
    flex-direction: column;
    align-items: stretch;
  }

  .card-footer,
  .notification-item-actions {
    width: 100%;
  }

  .save-btn,
  .cancel-btn,
  .action-btn {
    width: 100%;
  }
}
</style>
