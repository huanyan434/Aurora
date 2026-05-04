<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="announcement-dialog-content" :class="{ 'announcement-dialog-content-visible': isVisible }">
      <DialogHeader class="announcement-dialog-header">
        <div class="announcement-dialog-badge">
          <BellRing class="announcement-dialog-badge-icon" />
          <span>系统公告</span>
        </div>
        <DialogTitle class="announcement-dialog-title">
          {{ announcement.title }}
        </DialogTitle>
        <DialogDescription class="announcement-dialog-description">
          {{ announcement.summary }}
        </DialogDescription>
      </DialogHeader>

      <div class="announcement-dialog-body">
        <ul class="announcement-dialog-list">
          <li
            v-for="item in announcement.items"
            :key="item"
            class="announcement-dialog-list-item"
          >
            <span class="announcement-dialog-list-dot"></span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>

      <DialogFooter class="announcement-dialog-footer">
        <Button variant="outline" class="announcement-dialog-secondary" @click="handleDismissUntilNextAnnouncement">
          不再显示
        </Button>
        <Button class="announcement-dialog-primary" @click="handleDismissToday">
          我知道了
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { BellRing } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { getAnnouncement } from '@/api/user';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ANNOUNCEMENT_STORAGE_KEY = 'aurora-announcement-dismissed';
const ANNOUNCEMENT_SNOOZE_KEY = 'aurora-announcement-snooze-until';

const route = useRoute();
const open = ref(false);
const announcement = ref({
  version: '',
  title: '',
  summary: '',
  items: [] as string[],
});
const isVisible = computed(() => shouldShowOnRoute.value && hasAnnouncementContent.value);

const hasAnnouncementContent = computed(() => {
  return Boolean(
    announcement.value.title.trim()
    || announcement.value.summary.trim()
    || announcement.value.items.some((item) => item.trim()),
  );
});

const shouldShowOnRoute = computed(() => route.path === '/' || route.path.startsWith('/c'));

const getDismissedVersion = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) || '';
};

const getSnoozeUntil = () => {
  if (typeof window === 'undefined') {
    return 0;
  }

  const raw = window.localStorage.getItem(ANNOUNCEMENT_SNOOZE_KEY);
  const until = Number(raw || '0');
  return Number.isFinite(until) ? until : 0;
};

const isInSnoozeWindow = () => {
  return Date.now() < getSnoozeUntil();
};

const updateOpenState = () => {
  if (!isVisible.value) {
    open.value = false;
    return;
  }

  open.value = getDismissedVersion() !== announcement.value.version && !isInSnoozeWindow();
};

const loadAnnouncement = async () => {
  try {
    const response = await getAnnouncement();
    const data = response.data.data;

    announcement.value = {
      version: data?.version || '',
      title: data?.title || '',
      summary: data?.summary || '',
      items: (data?.content || '')
        .split('\n')
        .map((item: string) => item.trim())
        .filter(Boolean),
    };

    updateOpenState();
  } catch (error) {
    console.error('加载公告失败:', error);
    announcement.value = {
      version: '',
      title: '',
      summary: '',
      items: [],
    };
    open.value = false;
  }
};

const getTodaySnoozeUntil = () => {
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  return tomorrow.getTime();
};

const handleDismissToday = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ANNOUNCEMENT_SNOOZE_KEY, String(getTodaySnoozeUntil()));
    window.localStorage.removeItem(ANNOUNCEMENT_STORAGE_KEY);
  }

  open.value = false;
};

const handleDismissUntilNextAnnouncement = () => {
  if (typeof window !== 'undefined' && announcement.value.version) {
    window.localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, announcement.value.version);
    window.localStorage.removeItem(ANNOUNCEMENT_SNOOZE_KEY);
  }

  open.value = false;
};

const handleOpenChange = (nextOpen: boolean) => {
  if (!nextOpen) {
    open.value = false;
    return;
  }

  if (!isVisible.value) {
    open.value = false;
    return;
  }

  open.value = nextOpen;
};

const handleManualOpen = () => {
  if (!isVisible.value) {
    return;
  }

  open.value = true;
};

watch(
  () => route.path,
  () => {
    updateOpenState();
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener('open-announcement-dialog', handleManualOpen as EventListener);
  void loadAnnouncement();
});

onUnmounted(() => {
  window.removeEventListener('open-announcement-dialog', handleManualOpen as EventListener);
});
</script>

<style scoped>
.announcement-dialog-content {
  max-width: 32rem;
  border-color: rgba(147, 197, 253, 0.42);
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.98) 0%, rgba(255, 255, 255, 0.99) 100%);
  box-shadow: 0 24px 60px -24px rgba(37, 99, 235, 0.42);
  visibility: hidden;
}

.announcement-dialog-content-visible {
  visibility: visible;
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
}

.announcement-dialog-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.announcement-dialog-primary:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
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

@media (max-width: 640px) {
  .announcement-dialog-content {
    max-width: calc(100vw - 1.5rem);
    padding: 1.25rem;
  }

  .announcement-dialog-footer {
    flex-direction: column-reverse;
  }

  .announcement-dialog-secondary,
  .announcement-dialog-primary {
    width: 100%;
  }
}
</style>