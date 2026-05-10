<template>
  <Dialog :open="dialogOpen" @update:open="onOpenChange">
    <DialogContent class="announcement-dialog-content sm:max-w-[50dvw]" :class="dialogContentClass">
      <div ref="dialogContentRef" class="announcement-dialog-content-inner">
        <DialogHeader class="announcement-dialog-header">
          <div class="announcement-dialog-badge">
            <BellRing class="announcement-dialog-badge-icon" />
          </div>
          <DialogTitle class="announcement-dialog-title">
            公告中心
          </DialogTitle>
          <DialogDescription class="announcement-dialog-description">
            {{ activeTab === 'notifications' ? '查看最新通知内容。' : (announcement.summary || '查看系统公告详情。') }}
          </DialogDescription>
        </DialogHeader>

        <div class="announcement-dialog-body">
          <Tabs v-model="activeTab" class="announcement-tabs-root">
            <TabsList class="announcement-tabs-list">
              <TabsTrigger
                value="system"
                class="announcement-tabs-trigger data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                系统公告
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                class="announcement-tabs-trigger data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                通知
              </TabsTrigger>
            </TabsList>
            <TabsContent value="system" class="announcement-tab-pane">
              <div class="announcement-tab-panel">
                <div v-if="hasSystemAnnouncement" class="announcement-markdown" v-html="renderedContent"></div>
                <div v-else class="announcement-empty">
                  <div class="announcement-empty-title">暂无系统公告</div>
                  <div class="announcement-empty-description">当前没有启用的系统公告。</div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="notifications" class="announcement-tab-pane">
              <div class="announcement-tab-panel">
                <div v-if="notifications.length > 0" class="announcement-notification-list">
                  <div
                    v-for="notification in notifications"
                    :key="notification.id"
                    class="announcement-notification-item"
                  >
                    <div class="announcement-notification-content">{{ notification.content }}</div>
                    <div class="announcement-notification-time">{{ formatDate(notification.createdAt) }}</div>
                  </div>
                </div>
                <div v-else class="announcement-empty">暂无通知</div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter class="announcement-dialog-footer">
          <Button class="announcement-dialog-primary" @click="handleDismissNotificationBatch">
            我知道了
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { BellRing } from 'lucide-vue-next';
import { marked } from 'marked';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { getAnnouncement, getNotifications } from '@/api/user';
import { useAnnouncementStore } from '@/stores/announcement';

marked.setOptions({
  breaks: true,
});

const route = useRoute();
const announcementStore = useAnnouncementStore();
announcementStore.loadFromStorage();
const open = ref(false);
const activeTab = ref('system');
const dialogContentRef = ref<HTMLElement | null>(null);
const dialogContentClass = ref('');
let dialogContentObserver: ResizeObserver | null = null;

// 公告数据
const announcement = ref({
  summary: '',
  content: '',
  version: '',
});

// 通知数据
const notifications = ref<Array<{
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isRead: boolean;
}>>([]);

const renderedContent = computed(() => {
  const content = announcement.value.content || '';
  return content ? marked.parse(content) : '';
});

const isVisible = computed(() => shouldShowOnRoute.value && hasAnnouncementContent.value);

const dialogOpen = computed(() => open.value);

const hasSystemAnnouncement = computed(() => {
  const summary = String(announcement.value.summary || '').trim();
  const content = String(announcement.value.content || '').trim();
  return Boolean(summary || content);
});

// 检查是否有公告内容
const hasAnnouncementContent = computed(() => {
  const hasUnreadNotification = notifications.value.length > 0 && announcementStore.shouldShowNotifications(notifications.value[0]?.createdAt || '')
  const shouldShowSystemAnnouncement = hasSystemAnnouncement.value && announcementStore.shouldShowSystem(announcement.value.version)
  return shouldShowSystemAnnouncement || hasUnreadNotification;
});

// 检查是否应该在当前路由显示公告
const shouldShowOnRoute = computed(() => {
  return route.path === '/' || route.path.startsWith('/c');
});

// 更新打开状态
const syncDialogSizeClass = async () => {
  await nextTick();
  const el = dialogContentRef.value;
  if (!el) {
    dialogContentClass.value = isVisible.value ? 'announcement-dialog-content-visible' : '';
    return;
  }

  const width = el.offsetWidth;
  const height = el.offsetHeight;
  const classes = ['announcement-dialog-content-visible'];
  if (height >= window.innerHeight * 0.7) {
    classes.push('sm:h-[80dvh]');
  }
  dialogContentClass.value = classes.join(' ');
};

const startObserveDialog = () => {
  const el = dialogContentRef.value;
  if (!(el instanceof Element) || typeof ResizeObserver === 'undefined') {
    return;
  }

  if (dialogContentObserver) {
    dialogContentObserver.disconnect();
  }

  dialogContentObserver = new ResizeObserver(() => {
    void syncDialogSizeClass();
  });
  dialogContentObserver.observe(el);
};

const updateOpenState = () => {
  const latestNotification = notifications.value[0];
  const shouldShowNotification = Boolean(latestNotification?.createdAt) && announcementStore.shouldShowNotifications(latestNotification?.createdAt || '')
  const shouldShowSystem = hasSystemAnnouncement.value && announcementStore.shouldShowSystem(announcement.value.version)

  if (!shouldShowSystem && !shouldShowNotification) {
    open.value = false;
    return;
  }

  if (shouldShowSystem && announcement.value.version) {
    announcementStore.markSystemSeen(announcement.value.version);
  }
  if (shouldShowNotification && latestNotification?.createdAt) {
    announcementStore.markNotificationAck(latestNotification.createdAt);
  }

  open.value = true;
  activeTab.value = shouldShowNotification ? 'notifications' : 'system';
  void syncDialogSizeClass();
  startObserveDialog();
};

// 加载公告数据
const loadAnnouncement = async () => {
  try {
    const [announcementResponse, notificationsResponse] = await Promise.all([
      getAnnouncement(),
      getNotifications(),
    ]);

    const announcementData = announcementResponse.data || announcementResponse;
    announcement.value = {
      summary: announcementData?.summary || '',
      content: announcementData?.content || '',
      version: announcementData?.version || '',
    };

    const notificationData = notificationsResponse.data || notificationsResponse;
    notifications.value = Array.isArray(notificationData)
      ? notificationData.map((notification: any) => ({
          id: String(notification.id || ''),
          title: notification.title || '',
          content: notification.content || '',
          createdAt: notification.createdAt || notification.created_at || '',
          updatedAt: notification.updatedAt || notification.updated_at || '',
          isRead: notification.isRead || notification.is_read || false,
        }))
      : [];

    updateOpenState();
  } catch (error) {
    console.error('加载公告失败:', error);
    announcement.value = {
      summary: '',
      content: '',
      version: '',
    };
    notifications.value = [];
    open.value = false;
  }
};


const handleDismissNotificationBatch = () => {
  open.value = false;
};

// 处理打开状态变化
const onOpenChange = (nextOpen: boolean) => {
  open.value = nextOpen;
};

// 手动打开公告对话框
const handleManualOpen = () => {
  open.value = true;
  activeTab.value = 'system';
  void syncDialogSizeClass();
  startObserveDialog();
};

const handleNewNotification = () => {
  activeTab.value = 'notifications';
  open.value = true;
  void syncDialogSizeClass();
  startObserveDialog();
};

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 监听路由变化
watch(
  () => route.path,
  () => {
    updateOpenState();
  },
  { immediate: true },
);

watch(isVisible, () => {
  void syncDialogSizeClass();
});

// 组件挂载时加载公告
onMounted(() => {
  window.addEventListener('open-announcement-dialog', handleManualOpen as EventListener);
  window.addEventListener('new-notification', handleNewNotification as EventListener);
  void loadAnnouncement();
  startObserveDialog();
});

onUnmounted(() => {
  window.removeEventListener('open-announcement-dialog', handleManualOpen as EventListener);
  window.removeEventListener('new-notification', handleNewNotification as EventListener);
  if (dialogContentObserver) {
    dialogContentObserver.disconnect();
    dialogContentObserver = null;
  }
});

// 组件卸载时移除事件监听器
// onUnmounted(() => {
//   window.removeEventListener('open-announcement-dialog', handleManualOpen as EventListener);
//   window.removeEventListener('new-notification', handleNewNotification as EventListener);
// });
</script>

<style scoped>
.announcement-dialog-primary {
  background-color: var(--color-primary);
  color: var(--color-white);
}

.announcement-dialog-primary:hover {
  background-color: var(--color-primary-hover);
}

.announcement-dialog-content {
  width: 70dvw;
}

.announcement-dialog-content-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  max-height: 80dvh;
  overflow: hidden;
}

.announcement-dialog-content-visible {
  animation: announcement-dialog-fade-in 0.2s ease;
}

.announcement-dialog-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  margin-top: 1rem;
}

.announcement-tabs-root {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.announcement-tab-pane {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding-bottom: 1rem;
}

.announcement-tab-panel {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.25rem;
}


.announcement-dialog-secondary {
  border-color: rgba(148, 163, 184, 0.35);
}

.announcement-tabs-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  flex-shrink: 0;
  margin-bottom: 0.75rem;
}

.announcement-tabs-trigger {
  border-radius: 0.75rem;
  cursor: pointer;
  color: var(--color-gray-700);
}

.announcement-tabs-trigger[data-state='active'] {
  background: var(--color-primary);
  color: var(--color-white);
  border-color: var(--color-primary);
}

.announcement-markdown {
  color: var(--color-gray-900);
  line-height: 1.75;
}

.announcement-empty {
  padding: 2rem 0;
  text-align: center;
  color: var(--color-gray-500);
}

.announcement-empty-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-gray-700);
}

.announcement-empty-description {
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: var(--color-gray-500);
}

.announcement-notification-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.announcement-notification-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.announcement-notification-content {
  white-space: pre-wrap;
  color: var(--color-gray-900);
}

.announcement-notification-time {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-gray-500);
}

.dark .announcement-tabs-trigger {
  background: rgba(15, 23, 42, 0.72);
  border-color: rgba(148, 163, 184, 0.18);
  color: #cbd5e1;
}

.announcement-markdown :deep(h1),
.announcement-markdown :deep(h2),
.announcement-markdown :deep(h3),
.announcement-markdown :deep(h4),
.announcement-markdown :deep(h5),
.announcement-markdown :deep(h6) {
  font-size: revert !important;
  font-weight: revert !important;
  line-height: revert !important;
}

.dark .announcement-empty,
.dark .announcement-notification-time {
  color: #94a3b8;
}

.dark .announcement-notification-item {
  border-color: rgba(148, 163, 184, 0.16);
}
</style>