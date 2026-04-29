<template>
  <div class="share-page">
    <div class="share-card">
      <div class="share-header">
        <p class="share-badge">Aurora 分享</p>
        <h1 class="share-title">分享对话</h1>
        <p class="share-subtitle">通过公开链接查看分享的消息内容。</p>
      </div>

      <div v-if="loading" class="share-state">加载中...</div>
      <div v-else-if="error" class="share-state share-state-error">{{ error }}</div>
      <div v-else-if="messages.length === 0" class="share-state">暂无可显示的分享内容。</div>
      <div v-else class="share-messages">
        <div
          v-for="message in messages"
          :key="message.id"
          class="share-message-row"
          :class="message.role === 'user' ? 'share-message-row-user' : 'share-message-row-assistant'"
        >
          <div class="share-message-meta" :class="message.role === 'user' ? 'share-message-meta-user' : ''">
            <span v-if="message.role === 'user'" class="share-role">{{ message.username || '用户' }}</span>
            <span v-else-if="message.modelName" class="share-role">{{ message.modelName }}</span>
            <span class="share-time">{{ formatTime(message.createdAt) }}</span>
          </div>

          <div
            class="share-message-layout"
            :class="message.role === 'user' ? 'share-message-layout-user' : 'share-message-layout-assistant'"
          >
            <div
              class="share-message-bubble"
              :class="message.role === 'user' ? 'share-message-bubble-user' : 'share-message-bubble-assistant'"
            >
              <ReasoningContent
                v-if="message.reasoningContent"
                :content="message.reasoningContent"
                :reasoning-time="0"
                :is-streaming="false"
                :disable-typing="true"
              />

              <div v-if="message.role === 'user'">
                <div
                  v-if="message.content"
                  class="share-user-content"
                  v-html="renderUserContent(message.content)"
                ></div>
                <div v-if="message.base64" class="share-image-wrapper">
                  <img
                    :src="getImageSrc(message.base64)"
                    alt="分享图片"
                    class="share-image"
                    @error="handleImageError"
                  />
                </div>
              </div>

              <DsMarkdown
                v-else
                :content="message.content"
                :interval="0"
                :show-cursor="false"
                :disable-typing="true"
                cursor="circle"
              />
            </div>

            <Avatar v-if="message.role === 'user'" class="share-user-avatar share-user-avatar-beside-bubble">
              <AvatarImage :src="normalizeAvatar(message.avatar)" :alt="message.username || '用户头像'" />
              <AvatarFallback>{{ getUserInitial(message.username) }}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { loadShareMessages, type SharedMessage } from '@/api/chat';
import DsMarkdown from '@/components/DsMarkdown.vue';
import ReasoningContent from '@/components/ReasoningContent.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const route = useRoute();
const loading = ref(true);
const error = ref('');
const messages = ref<SharedMessage[]>([]);

const normalizeAvatar = (avatar: string) => {
  if (!avatar) return '';
  if (avatar.startsWith('data:')) return avatar;
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/')) return avatar;
  return `data:image/png;base64,${avatar}`;
};

const getUserInitial = (username: string) => {
  return username?.trim()?.charAt(0)?.toUpperCase() || 'U';
};

const renderUserContent = (content: string) => {
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const imgTagRegex = /<img[^>]*>/gi;
  const parts = content.split(imgTagRegex);
  const imgTags = content.match(imgTagRegex) || [];

  const escapedParts = parts.map((part, index) => {
    if (index < imgTags.length) {
      return `${escapeHtml(part)}${imgTags[index]}`;
    }
    return escapeHtml(part);
  });

  return escapedParts.join('');
};

const getImageSrc = (src: string) => {
  if (!src) return '';
  if (src.startsWith('data:')) return src;

  let imageType = 'jpeg';
  if (src.startsWith('iVBORw0KGgo=')) {
    imageType = 'png';
  } else if (src.startsWith('R0lGODlh') || src.startsWith('R0lGODdh')) {
    imageType = 'gif';
  } else if (src.startsWith('TU0AK')) {
    imageType = 'tiff';
  }

  return `data:image/${imageType};base64,${src}`;
};

const handleImageError = (event: Event) => {
  const imgElement = event.target as HTMLImageElement;
  imgElement.style.display = 'none';
};

const formatTime = (time: string) => {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeMessage = (message: Partial<SharedMessage>): SharedMessage => {
  return {
    id: Number(message.id ?? 0),
    conversationID: Number(message.conversationID ?? 0),
    role: (message.role ?? 'assistant') as 'user' | 'assistant',
    content: String(message.content ?? ''),
    base64: message.base64 ?? '',
    reasoningContent: message.reasoningContent ?? '',
    createdAt: String(message.createdAt ?? ''),
    username: message.username ?? '',
    avatar: message.avatar ?? '',
    modelName: message.modelName ?? '',
  };
};

const loadData = async () => {
  const shareId = String(route.params.shareId || '');
  if (!shareId) {
    error.value = '分享链接无效';
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const response = await loadShareMessages(shareId);
    if (!response.data.success) {
      throw new Error(response.data.error || '加载分享内容失败');
    }

    messages.value = (response.data.messages || []).map((message: SharedMessage) => normalizeMessage(message));
  } catch (err) {
    console.error('加载分享内容失败:', err);
    error.value = '分享内容加载失败或已过期';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.share-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
  padding: 32px 16px;
}

.share-card {
  max-width: 960px;
  margin: 0 auto;
  border-radius: 24px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.share-header {
  padding: 32px 32px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.share-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  background-color: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
}

.share-title {
  margin-top: 16px;
  font-size: 32px;
  line-height: 1.2;
  font-weight: 700;
  color: #111827;
}

.share-subtitle {
  margin-top: 8px;
  font-size: 15px;
  color: #6b7280;
}

.share-state {
  padding: 48px 32px;
  text-align: center;
  color: #6b7280;
  font-size: 15px;
}

.share-state-error {
  color: #dc2626;
}

.share-messages {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 20px 32px;
}

.share-message-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.share-message-row-user {
  align-items: flex-end;
}

.share-message-row-assistant {
  align-items: flex-start;
}

.share-message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
}

.share-message-meta-user {
  justify-content: flex-end;
}

.share-user-avatar {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(209, 213, 219, 0.9);
}

.share-user-avatar-beside-bubble {
  flex-shrink: 0;
}

.share-role {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.share-time {
  font-size: 12px;
  color: #9ca3af;
}

.share-message-layout {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.share-message-layout-user {
  justify-content: flex-end;
}

.share-message-layout-assistant {
  justify-content: flex-start;
}

.share-message-bubble {
  max-width: min(100%, 760px);
  border-radius: 20px;
  padding: 16px 18px;
  color: #111827;
}

.share-message-bubble-user {
  width: fit-content;
  background: #f3f4f6;
}

.share-message-bubble-assistant {
  width: min(100%, 760px);
  background: #ffffff;
}

.share-model-name {
  margin-bottom: 8px;
  font-size: 13px;
  color: #6b7280;
}

.share-user-content {
  color: #1f2937;
  word-break: break-word;
  line-height: 1.75;
}

.share-image-wrapper {
  margin-top: 12px;
}

.share-image {
  max-width: 100%;
  border-radius: 16px;
}

@media (max-width: 768px) {
  .share-page {
    padding: 16px 12px;
  }

  .share-card {
    border-radius: 20px;
  }

  .share-header {
    padding: 24px 20px 16px;
  }

  .share-title {
    font-size: 24px;
  }

  .share-messages {
    padding: 20px 12px 24px;
  }

  .share-message-layout {
    gap: 10px;
  }

  .share-user-avatar {
    width: 32px;
    height: 32px;
  }

  .share-message-bubble {
    max-width: 100%;
    padding: 14px 16px;
  }

  .share-message-bubble-assistant {
    width: 100%;
  }
}
</style>
