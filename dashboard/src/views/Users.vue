<template>
  <div class="page-container animate-fade-in">
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <p class="page-subtitle">管理系统中的所有用户</p>
    </div>

    <!-- 用户表格 -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>用户名</th>
            <th>邮箱</th>
            <th>会员等级</th>
            <th>积分</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="table-row">
            <td>
              <div class="user-info">
                <div class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</div>
                <span class="user-id">{{ user.id }}</span>
              </div>
            </td>
            <td>
              <span class="font-semibold">{{ user.username }}</span>
            </td>
            <td>
              <span class="text-muted">{{ user.email }}</span>
            </td>
            <td>
              <span :class="['badge', getMemberLevelClass(user.memberLevel)]">
                <span class="badge-icon">{{ getMemberLevelIcon(user.memberLevel) }}</span>
                {{ getMemberLevelText(user.memberLevel) }}
              </span>
            </td>
            <td>
              <div class="points-display">
                <span class="points-icon">💎</span>
                <span class="points-value">{{ user.points.toLocaleString() }}</span>
              </div>
            </td>
            <td>
              <button class="edit-btn" @click="openEditModal(user)">
                编辑
              </button>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="6" class="empty-state">
              <span class="empty-icon">📭</span>
              <p>暂无用户数据</p>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 分页 -->
      <div class="table-footer">
        <p class="table-info">
          共 <span class="font-semibold">{{ total }}</span> 条记录
        </p>
        <div class="pagination">
          <button
            @click="changePage(page - 1)"
            :disabled="page === 1"
            class="pagination-btn"
          >
            ← 上一页
          </button>
          <span class="page-number">第 {{ page }} 页</span>
          <button
            @click="changePage(page + 1)"
            :disabled="users.length < pageSize"
            class="pagination-btn"
          >
            下一页 →
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">编辑用户</h2>
          <button class="modal-close" @click="closeEditModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">用户名</label>
            <input type="text" :value="editingUser?.username" class="form-input" disabled />
          </div>
          <div class="form-group">
            <label class="form-label">邮箱</label>
            <input type="email" :value="editingUser?.email" class="form-input" disabled />
          </div>
          <div class="form-group">
            <label class="form-label">积分</label>
            <input 
              v-model.number="editForm.points" 
              type="number" 
              class="form-input" 
              min="0"
              placeholder="输入积分"
            />
          </div>
          <div class="form-group">
            <label class="form-label">会员等级</label>
            <select v-model="editForm.memberLevel" class="form-input">
              <option value="free">免费用户</option>
              <option value="VIP">VIP 会员</option>
              <option value="SVIP">SVIP 会员</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">
              <input 
                v-model="editForm.isMember" 
                type="checkbox" 
                style="width: auto; margin-right: 8px;"
              />
              是否为会员
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeEditModal">取消</button>
          <button class="btn-submit" @click="saveUser" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dashboardApi } from '@/api/dashboard'
import type { User } from '@/types'

const users = ref<User[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const showEditModal = ref(false)
const editingUser = ref<User | null>(null)
const saving = ref(false)

const editForm = ref({
  points: 0,
  isMember: false,
  memberLevel: 'free'
})

const getMemberLevelClass = (level: string) => {
  const classes: Record<string, string> = {
    free: 'badge-default',
    VIP: 'badge-primary',
    SVIP: 'badge-warning'
  }
  return classes[level] || classes.free
}

const getMemberLevelIcon = (level: string) => {
  const icons: Record<string, string> = {
    free: '👤',
    VIP: '⭐',
    SVIP: '👑'
  }
  return icons[level] || '👤'
}

const getMemberLevelText = (level: string) => {
  const texts: Record<string, string> = {
    free: '免费用户',
    VIP: 'VIP 会员',
    SVIP: 'SVIP 会员'
  }
  return texts[level] || '免费用户'
}

const openEditModal = (user: User) => {
  editingUser.value = user
  editForm.value = {
    points: user.points,
    isMember: user.isMember,
    memberLevel: user.memberLevel
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingUser.value = null
}

const saveUser = async () => {
  if (!editingUser.value) return
  
  saving.value = true
  try {
    await dashboardApi.updateUser({
      userId: parseInt(editingUser.value.id),
      points: editForm.value.points,
      isMember: editForm.value.isMember,
      memberLevel: editForm.value.memberLevel
    })
    
    // 更新本地数据
    const index = users.value.findIndex(u => u.id === editingUser.value?.id)
    if (index !== -1 && editingUser.value) {
      users.value[index] = {
        ...editingUser.value,
        points: editForm.value.points,
        isMember: editForm.value.isMember,
        memberLevel: editForm.value.memberLevel
      }
    }
    
    closeEditModal()
    alert('更新成功')
  } catch (error) {
    console.error('更新失败:', error)
    alert('更新失败，请重试')
  } finally {
    saving.value = false
  }
}

const loadUsers = async () => {
  try {
    const response = await dashboardApi.getUsers(page.value, pageSize.value)
    users.value = response.data.data.users
    total.value = response.data.data.total
  } catch (error) {
    console.error('加载用户列表失败:', error)
  }
}

const changePage = (newPage: number) => {
  if (newPage < 1) return
  page.value = newPage
  loadUsers()
}

onMounted(() => {
  loadUsers()
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

/* 表格容器 */
.table-container {
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

/* 数据表格 */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 2px solid var(--border-color);
}

.data-table th {
  padding: 16px 20px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table tbody tr {
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
}

.data-table tbody tr:hover {
  background: #f8fafc;
}

.data-table td {
  padding: 16px 20px;
  font-size: 14px;
}

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.user-id {
  font-size: 13px;
  color: var(--text-muted);
}

.font-semibold {
  font-weight: 600;
  color: var(--text-primary);
}

.text-muted {
  color: var(--text-secondary);
}

/* 徽章 */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.badge-default {
  background: #f1f5f9;
  color: #64748b;
}

.badge-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.badge-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  color: white;
}

.badge-icon {
  font-size: 14px;
}

/* 积分显示 */
.points-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.points-icon {
  font-size: 16px;
}

.points-value {
  font-weight: 600;
  color: var(--primary-color);
}

/* 编辑按钮 */
.edit-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 表格底部 */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-top: 1px solid var(--border-color);
}

.table-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.table-info .font-semibold {
  color: var(--primary-color);
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-number {
  padding: 8px 16px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px !important;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

/* 弹窗 */
.modal-overlay {
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
  animation: fadeIn 0.2s;
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: var(--shadow-xl);
  animation: slideIn 0.3s;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f1f5f9;
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s;
  background: #f8fafc;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  background: white;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  padding: 10px 20px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f1f5f9;
}

.btn-submit {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .data-table {
    font-size: 13px;
  }

  .data-table th,
  .data-table td {
    padding: 12px 10px;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .table-footer {
    flex-direction: column;
    gap: 12px;
  }

  .pagination {
    width: 100%;
    justify-content: center;
  }
}
</style>
