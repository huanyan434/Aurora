<template>
  <div class="admins-container">
    <div class="header">
      <h1 class="title">管理员管理</h1>
      <button @click="showCreateDialog = true" class="create-btn">
        <span>➕</span>
        <span>新增管理员</span>
      </button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="admins-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>权限等级</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="admin in admins" :key="admin.id">
            <td>{{ admin.id }}</td>
            <td>{{ admin.username }}</td>
            <td>
              <span :class="['level-badge', `level-${admin.level}`]">
                {{ getLevelText(admin.level) }}
              </span>
            </td>
            <td>{{ formatDate(admin.created_at) }}</td>
            <td>
              <button @click="editAdmin(admin)" class="action-btn edit-btn">编辑</button>
              <button @click="confirmDelete(admin)" class="action-btn delete-btn">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 创建/编辑对话框 -->
    <div v-if="showCreateDialog || showEditDialog" class="dialog-overlay" @click.self="closeDialogs">
      <div class="dialog">
        <h2>{{ showCreateDialog ? '新增管理员' : '编辑管理员' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="formData.username" type="text" required placeholder="请输入用户名" />
          </div>
          <div class="form-group">
            <label>密码{{ showEditDialog ? '（留空则不修改）' : '' }}</label>
            <input
              v-model="formData.password"
              type="password"
              :required="showCreateDialog"
              placeholder="请输入密码"
            />
          </div>
          <div class="form-group">
            <label>权限等级</label>
            <select v-model.number="formData.level" required>
              <option :value="0">0级 - 最高权限</option>
              <option :value="1">1级 - 不能修改用户名密码</option>
              <option :value="2">2级 - 不能修改会员</option>
              <option :value="3">3级 - 仅查看</option>
            </select>
          </div>
          <div v-if="error" class="error-message">{{ error }}</div>
          <div class="dialog-actions">
            <button type="button" @click="closeDialogs" class="cancel-btn">取消</button>
            <button type="submit" :disabled="submitting" class="submit-btn">
              {{ submitting ? '提交中...' : '确定' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteDialog" class="dialog-overlay" @click.self="showDeleteDialog = false">
      <div class="dialog">
        <h2>确认删除</h2>
        <p>确定要删除管理员 <strong>{{ deleteTarget?.username }}</strong> 吗？</p>
        <div v-if="error" class="error-message">{{ error }}</div>
        <div class="dialog-actions">
          <button @click="showDeleteDialog = false" class="cancel-btn">取消</button>
          <button @click="handleDelete" :disabled="submitting" class="delete-btn">
            {{ submitting ? '删除中...' : '确定删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dashboardApi, type Admin } from '@/api/dashboard'

const admins = ref<Admin[]>([])
const loading = ref(false)
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const error = ref('')
const submitting = ref(false)

const formData = ref({
  adminId: 0,
  username: '',
  password: '',
  level: 3
})

const deleteTarget = ref<Admin | null>(null)

const getLevelText = (level: number) => {
  const map: Record<number, string> = {
    0: '0级-最高权限',
    1: '1级-不能改用户名密码',
    2: '2级-不能改会员',
    3: '3级-仅查看'
  }
  return map[level] || '未知'
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const loadAdmins = async () => {
  loading.value = true
  try {
    const res = await dashboardApi.getAdmins()
    if (res.data.success) {
      admins.value = res.data.data
    }
  } catch (err) {
    console.error('加载管理员列表失败', err)
  } finally {
    loading.value = false
  }
}

const editAdmin = (admin: Admin) => {
  formData.value = {
    adminId: admin.id,
    username: admin.username,
    password: '',
    level: admin.level
  }
  showEditDialog.value = true
}

const confirmDelete = (admin: Admin) => {
  deleteTarget.value = admin
  showDeleteDialog.value = true
  error.value = ''
}

const closeDialogs = () => {
  showCreateDialog.value = false
  showEditDialog.value = false
  error.value = ''
  formData.value = {
    adminId: 0,
    username: '',
    password: '',
    level: 3
  }
}

const handleSubmit = async () => {
  error.value = ''
  submitting.value = true
  try {
    if (showCreateDialog.value) {
      const res = await dashboardApi.createAdmin({
        username: formData.value.username,
        password: formData.value.password,
        level: formData.value.level
      })
      if (res.data.success) {
        closeDialogs()
        loadAdmins()
      } else {
        error.value = res.data.message
      }
    } else {
      const res = await dashboardApi.updateAdmin({
        adminId: formData.value.adminId,
        username: formData.value.username,
        password: formData.value.password || undefined,
        level: formData.value.level
      })
      if (res.data.success) {
        closeDialogs()
        loadAdmins()
      } else {
        error.value = res.data.message
      }
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || '操作失败'
  } finally {
    submitting.value = false
  }
}

const handleDelete = async () => {
  if (!deleteTarget.value) return
  error.value = ''
  submitting.value = true
  try {
    const res = await dashboardApi.deleteAdmin({ adminId: deleteTarget.value.id })
    if (res.data.success) {
      showDeleteDialog.value = false
      deleteTarget.value = null
      loadAdmins()
    } else {
      error.value = res.data.message
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || '删除失败'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadAdmins()
})
</script>

<style scoped>
.admins-container {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #18181b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  background: #27272a;
  transform: translateY(-2px);
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.admins-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #fafafa;
}

th {
  padding: 16px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

td {
  padding: 16px;
  font-size: 14px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

tbody tr:hover {
  background: #fafafa;
}

.level-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.level-0 {
  background: #fef3c7;
  color: #92400e;
}

.level-1 {
  background: #dbeafe;
  color: #1e40af;
}

.level-2 {
  background: #d1fae5;
  color: #065f46;
}

.level-3 {
  background: #e5e7eb;
  color: #374151;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 8px;
}

.edit-btn {
  background: #dbeafe;
  color: #1e40af;
}

.edit-btn:hover {
  background: #bfdbfe;
}

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.delete-btn:hover {
  background: #fecaca;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.dialog h2 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #18181b;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-btn {
  padding: 10px 20px;
  background: #f3f4f6;
  color: var(--text-primary);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.submit-btn {
  padding: 10px 20px;
  background: #18181b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover {
  background: #27272a;
}

.submit-btn:disabled,
.delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
