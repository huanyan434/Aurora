<template>
    <div class="messages-scroll-container w-full h-full overflow-y-auto p-4" ref="containerRef">
        <div class="max-w-3xl mx-auto space-y-6">
            <!-- 消息列表 -->
            <div v-for="(message, index) in displayedMessages" :key="message.id || index" class="flex flex-col"
                :class="message.role === 'user' ? 'items-end' : 'items-start'"
                @mouseenter="hoveredMessageId = message.id || null" @mouseleave="hoveredMessageId = null">
                <div :class="[
                    'rounded-lg px-4 py-3',
                    message.role === 'user'
                        ? 'bg-gray-100 dark:bg-user-msg-bg user-message'
                        : 'assistant-message',
                ]">
                    <!-- 用户消息 -->
                    <div v-if="message.role === 'user'">
                        <!-- 文本内容 -->
                        <div v-if="message.content" class="text-gray-800 dark:text-gray-200"
                            v-html="renderUserContent(message.content)"></div>

                        <!-- 图片附件 -->
                        <div v-if="message.base64" class="mt-2">
                            <img :src="getImageSrc(message.base64)" alt="上传的图片" class="max-w-full h-auto rounded"
                                @error="handleImageError" />
                        </div>
                    </div>

                    <!-- 助手消息 -->
                    <div v-else>
                        <!-- 模型名称显示 -->
                        <div v-if="extractModelName(message.content)"
                            class="mb-2 text-sm text-gray-500 dark:text-gray-300">
                            {{ extractModelName(message.content) }}
                        </div>

                        <!-- 推理内容 -->
                        <ReasoningContent v-if="message.reasoningContent" :content="message.reasoningContent"
                            :reasoning-time="message.reasoningTime || 0" :is-streaming="message.isStreaming || false"
                            :disable-typing="message.disableTyping || false" />

                        <!-- 回复内容 - 根据 isHistory 字段选择组件 -->
                        <div v-if="message.isHistory">
                            <DsMarkdown :content="message.content" :interval="0" :show-cursor="false"
                                :disable-typing="true" cursor="circle"
                                :on-end="() => handleHistoryMessageEnd(message.id)" />
                        </div>
                        <!-- 流式消息使用 DsMarkdownCMD -->
                        <div v-else-if="message.content || !message.isStreaming">
                            <DsMarkdownCMD :content="message.content" :interval="15" :show-cursor="message.isStreaming"
                                cursor="circle" :on-typed-char="(data) => handleTypedChar(message.id, data)" />
                        </div>

                        <!-- 加载占位符 -->
                        <div v-else-if="message.isStreaming" class="inline-flex items-center space-x-1">
                            <div class="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                                style="animation-duration: 0.6s"></div>
                            <div class="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                                style="animation-duration: 0.6s; animation-delay: 0.1s"></div>
                            <div class="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                                style="animation-duration: 0.6s; animation-delay: 0.2s"></div>
                        </div>
                    </div>
                </div>

                <!-- 消息操作按钮 -->
                <div :class="[
                    'flex flex-row items-start mt-1 min-h-[24px] transition-opacity duration-150',
                    message.role === 'user' ? 'mr-2' : 'ml-2',
                    hoveredMessageId === (message.id || null) ||
                        index === displayedMessages.length - 1
                        ? 'opacity-100'
                        : 'opacity-0',
                ]" v-show="!(message.role === 'assistant' && (typingStates.get(message.id || -1)?.isTyping || message.isStreaming))
                        ">
                    <button @click="copyMessage(message.content)" class="copy-btn">
                        <Copy class="message-action-icon" />
                    </button>

                    <button @click="openShareDialog(message.id)" class="copy-btn">
                        <Share2 class="message-action-icon" />
                    </button>

                    <button @click="openDeleteDialog(message.id)" class="delete-btn">
                        <Trash2 class="message-action-icon" />
                    </button>
                </div>
            </div>

            <!-- 分享链接对话框 -->
            <Dialog :open="isShareDialogOpen" @update:open="isShareDialogOpen = $event">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>分享对话</DialogTitle>
                        <DialogDescription>
                            生成公开分享链接后，任何拿到链接的人都可以查看当前消息及其之前的对话内容。
                        </DialogDescription>
                    </DialogHeader>
                    <div class="share-dialog-body">
                        <div v-if="shareLink" class="share-link-box">
                            {{ shareLink }}
                        </div>
                        <div v-else class="share-dialog-placeholder">
                            点击下方按钮生成分享链接。
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" @click="isShareDialogOpen = false">
                            关闭
                        </Button>
                        <Button @click="handleShareMessage" :disabled="isSharing" class="share-confirm-btn">
                            {{ isSharing ? '生成中...' : shareLink ? '复制链接' : '生成链接' }}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <!-- 删除确认对话框 -->
            <Dialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认删除</DialogTitle>
                        <DialogDescription>
                            确定要删除这条消息吗？此操作无法撤销。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button @click="isDeleteDialogOpen = false"
                            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none">
                            取消
                        </button>
                        <button @click="confirmDeleteMessage"
                            class="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none">
                            删除
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <!-- 占位消息，提示目前逻辑为空 -->
            <div v-if="!isLoading && displayedMessages.length === 0"
                class="text-center text-gray-500 dark:text-gray-400 py-10">
                尚无消息，开始对话吧！
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import {
    deleteMessage as deleteMessageAPI,
    getModelsList,
    getMessagesList,
    shareMessages,
    wsManager,
} from "@/api/chat";
import { useRoute, useRouter } from "vue-router";
import { useChatStore } from "@/stores/chat";
import type { Message } from '@/stores/chat';
import ReasoningContent from "./ReasoningContent.vue";
import DsMarkdown from "./DsMarkdown.vue";
import DsMarkdownCMD from "./DsMarkdownCMD.vue";
import { Copy, Share2, Trash2 } from 'lucide-vue-next';
import { toastSuccess, toastError, toastInfo } from "@/components/ui/toast/use-toast";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

// 路由和路由参数
const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();

// 状态变量
const isLoading = ref(false);
const hoveredMessageId = ref<number | null>(null);
const isDeleteDialogOpen = ref(false);
const isShareDialogOpen = ref(false);
const isSharing = ref(false);
const shareLink = ref('');
const shareLinkCache = ref<Map<number, string>>(new Map());
const messageToDelete = ref<number | null>(null);
const messageToShare = ref<number | null>(null);
const models = ref<any[]>([]);
const containerRef = ref<HTMLElement | null>(null);
// 跟踪哪些消息的 markdown 渲染已完成
const markdownEndedIds = ref<Set<number>>(new Set());

// 滚动相关状态
const followBottomFrameId = ref<number | undefined>(undefined);
const followBottomPhase = ref<'idle' | 'following'>('following');
const lastScrollHeight = ref(0);
const lastScrollTop = ref(0);

// 打字状态管理
interface TypingState {
    expectedContent: string;  // 预期要打印的完整内容（从后端流式接收）
    typedContent: string;     // 已经打印的内容（从 onTypedChar 回调获取）
    isTyping: boolean;        // 是否正在打字
}
const typingStates = ref<Map<number, TypingState>>(new Map());

// 向父组件报告历史消息渲染状态
const emit = defineEmits<{
    (e: 'render-complete', value: boolean): void;
}>();
emit("render-complete", false);
const emittedRenderComplete = ref(false);
const totalHistoryCount = ref(0);
const renderedHistoryCount = ref(0);

/**
 * 滚动消息区域到底部
 * @param force 是否强制滚动到底部
 */
const scrollMessagesAreaToBottom = async (force = false) => {
    await nextTick();
    const container = containerRef.value;
    if (!container) return;

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (force || distanceToBottom <= 50) {
        container.scrollTop = container.scrollHeight;
    }
};

/**
 * 运行跟随底部循环
 */
const runFollowBottomLoop = () => {
    if (followBottomFrameId.value !== undefined) {
        window.cancelAnimationFrame(followBottomFrameId.value);
    }

    const tick = () => {
        if (followBottomPhase.value === 'idle') {
            followBottomFrameId.value = undefined;
            return;
        }

        const container = containerRef.value;
        if (!container) {
            followBottomFrameId.value = window.requestAnimationFrame(tick);
            return;
        }

        const currentScrollHeight = container.scrollHeight;
        const currentScrollTop = container.scrollTop;
        const clientHeight = container.clientHeight;

        const distanceToBottom = currentScrollHeight - currentScrollTop - clientHeight;
        const heightIncreased = currentScrollHeight > lastScrollHeight.value;
        const scrollTopIncreased = currentScrollTop > lastScrollTop.value;

        if ((heightIncreased || scrollTopIncreased) && distanceToBottom <= 50) {
            container.scrollTop = currentScrollHeight;
        }

        lastScrollHeight.value = currentScrollHeight;
        lastScrollTop.value = currentScrollTop;

        followBottomFrameId.value = window.requestAnimationFrame(tick);
    };

    followBottomFrameId.value = window.requestAnimationFrame(tick);
};

/**
 * 处理强制滚动到底部事件
 * @param event 滚动事件
 */
const handleForceScrollToBottom = async (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent?.detail) {
        await scrollMessagesAreaToBottom(true);
    }
};

// 使用计算属性获取当前对话 ID（从路由路径）
const currentConversationId = computed(() => {
    const pathParts = route.path.split("/");
    if (pathParts[1] === "c" && pathParts[2]) {
        return parseInt(pathParts[2]);
    }
    return NaN;
});

// 从 store 中获取消息
const displayedMessages = computed(() => {
    const convId = currentConversationId.value;
    if (isNaN(convId)) return [];
    const messages = chatStore.getMessagesByConversationId(convId) || [];
    // 更新总历史消息数
    const historyMessages = messages.filter((message) => message.role === 'assistant' && message.isHistory);
    totalHistoryCount.value = historyMessages.length;

    // 为每条消息添加 markdownEnded 状态
    return messages.map(msg => ({
        ...msg,
        markdownEnded: markdownEndedIds.value.has(msg.id || -1),
    }));
});

watch(
    () => currentConversationId.value,
    () => {
        emittedRenderComplete.value = false;
        totalHistoryCount.value = 0;
        renderedHistoryCount.value = 0;
        markdownEndedIds.value = new Set();
    },
    { immediate: true },
);


/**
 * 处理历史消息的 onEnd 回调
 * 历史消息渲染完成后强制滚动到底部
 * @param messageId 消息 ID
 */
const handleHistoryMessageEnd = (messageId: number | undefined) => {
    if (messageId === undefined) return;

    markdownEndedIds.value.add(messageId);
    renderedHistoryCount.value++;

    // 检查是否所有历史消息都渲染完成
    if (renderedHistoryCount.value >= totalHistoryCount.value && totalHistoryCount.value > 0) {
        // 使用 nextTick + 双 RAF 确保 DOM 渲染稳定
        nextTick().then(() => {
            let lastHeight = 0;
            let stableFrames = 0;
            let checkCount = 0;

            // 兜底超时，防止 RAF 循环卡住
            const timeoutId = setTimeout(() => {
                // 滚动到底部
                if (containerRef.value) {
                    containerRef.value.scrollTop = containerRef.value.scrollHeight;
                }
                emit('render-complete', true);
                console.log("emit 超时");
            }, 10000); // 10秒兜底

            const checkStable = () => {
                checkCount++;
                const currentHeight = containerRef.value?.scrollHeight || 0;
                if (currentHeight === lastHeight) {
                    stableFrames++;
                    if (stableFrames >= 2) {
                        // 高度连续两帧稳定，认为渲染完成
                        clearTimeout(timeoutId); // 清除兜底定时器
                        // 滚动到底部
                        if (containerRef.value) {
                            containerRef.value.scrollTop = containerRef.value.scrollHeight;
                        }
                        emit('render-complete', true);
                        console.log("emit: complete");
                        return;
                    }
                } else {
                    // 高度变化，重置计数
                    stableFrames = 0;
                    lastHeight = currentHeight;
                }

                // 防止无限循环
                if (checkCount > 100) {
                    clearTimeout(timeoutId);
                    // 滚动到底部
                    if (containerRef.value) {
                        containerRef.value.scrollTop = containerRef.value.scrollHeight;
                    }
                    emit('render-complete', true);
                    console.log("emit 循环");
                    return;
                }

                requestAnimationFrame(checkStable);
            };
            requestAnimationFrame(checkStable);
        });
    }
};


/**
 * 获取或初始化打字状态
 */
const getTypingState = (messageId: number): TypingState => {
    if (!typingStates.value.has(messageId)) {
        typingStates.value.set(messageId, {
            expectedContent: '',
            typedContent: '',
            isTyping: false,
        });
    }
    return typingStates.value.get(messageId)!;
};

/**
 * 处理每个字符打字后的回调
 */
const handleTypedChar = (messageId: number | undefined, data?: any) => {
    if (messageId === undefined) return;

    const state = getTypingState(messageId);

    // 更新已打字内容
    if (data && data.content !== undefined) {
        state.typedContent = data.content;
    }


    // 检查是否打字完成
    const message = displayedMessages.value.find(msg => msg.id === messageId);
    if (!message) return;

    // 判断打字是否完成：已打内容等于预期内容，且后端已停止生成
    if (state.typedContent === state.expectedContent && !message.isStreaming) {
        console.log('[handleTypedChar] 打字完成，消息 ID:', messageId);
        state.isTyping = false;
        markdownEndedIds.value.add(messageId);
    }
};

/**
 * 渲染用户消息内容（仅处理 base64 图片标签）
 * @param content 原始内容
 * @returns 处理后的 HTML
 */
const renderUserContent = (content: string) => {
    if (!content) return "";

    // 处理 <base64>xxx</base64> 标签，将其替换为图片
    let processedContent = content.replace(
        /<base64>([^<]+)<\/base64>/g,
        (_match, base64Content) => {
            const trimmedContent = base64Content.trim();

            // 检查是否已经是完整的 data:image URL
            if (trimmedContent.startsWith("data:image/")) {
                // 如果是完整的 data URL，直接使用
                return `<img src="${trimmedContent}" alt="嵌入图片" class="max-w-full h-auto rounded border border-gray-300 dark:border-gray-700" onerror="this.style.display='none'" onload="this.style.display='block'" />`;
            }
            // 否则检查是否为纯 base64 字符串
            else {
                // 验证 base64 格式
                const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                if (base64Regex.test(trimmedContent)) {
                    // 如果是有效的 base64，创建图片标签
                    // 尝试检测图片类型，如果没有检测到则默认使用 jpeg
                    let imageType = "jpeg"; // 默认类型

                    // 检查 base64 字符串是否包含图片类型信息
                    if (trimmedContent.startsWith("/9j/")) {
                        // JPEG 文件头
                        imageType = "jpeg";
                    } else if (trimmedContent.startsWith("iVBORw0KGgo=")) {
                        // PNG 文件头
                        imageType = "png";
                    } else if (
                        trimmedContent.startsWith("R0lGODlh") ||
                        trimmedContent.startsWith("R0lGODdh")
                    ) {
                        // GIF 文件头
                        imageType = "gif";
                    } else if (trimmedContent.startsWith("TU0AK")) {
                        // TIFF 文件头
                        imageType = "tiff";
                    }

                    return `<img src="data:image/${imageType};base64,${trimmedContent}" alt="嵌入图片" class="max-w-full h-auto rounded border border-gray-300 dark:border-gray-700" onerror="this.style.display='none'" onload="this.style.display='block'" />`;
                } else {
                    // 如果不是有效的 base64，返回空字符串（移除标签）
                    console.warn(
                        "Invalid base64 format detected and removed:",
                        trimmedContent,
                    );
                    return ""; // 返回空字符串，移除无效标签
                }
            }
        },
    );

    // 转义 HTML 以防止 XSS 攻击，但保留已处理的图片标签
    const escapeHtml = (unsafe: string) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // 分割内容，对非图片部分进行 HTML 转义
    const parts = processedContent.split(/(<img\s[^>]*>)/gi);
    const escapedParts = parts.map((part) => {
        if (part.toLowerCase().startsWith("<img")) {
            // 如果是图片标签，不进行转义
            return part;
        } else {
            // 如果是非图片内容，进行 HTML 转义
            return escapeHtml(part);
        }
    });

    return escapedParts.join("");
};

const getShareableMessages = (messages: Message[], targetMessageId: number) => {
    const targetIndex = messages.findIndex((message) => message.id === targetMessageId);
    if (targetIndex === -1) {
        return [];
    }

    return messages
        .slice(0, targetIndex + 1)
        .filter((message) => typeof message.id === 'number' && !message.isStreaming);
};

const copyText = async (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (!successful) {
            throw new Error('execCommand 复制失败');
        }
    } finally {
        document.body.removeChild(textArea);
    }
};

const openShareDialog = (messageId: number | undefined) => {
    if (messageId === undefined) return;

    messageToShare.value = messageId;
    shareLink.value = shareLinkCache.value.get(messageId) || '';
    isShareDialogOpen.value = true;
};

const handleShareMessage = async () => {
    if (!messageToShare.value) {
        toastError('未找到要分享的消息');
        return;
    }

    if (shareLink.value) {
        try {
            await copyText(shareLink.value);
            toastSuccess('分享链接已复制到剪贴板');
        } catch (error) {
            console.error('复制分享链接失败:', error);
            toastError('复制分享链接失败');
        }
        return;
    }

    const shareableMessages = getShareableMessages(displayedMessages.value as Message[], messageToShare.value);
    if (shareableMessages.length === 0) {
        toastError('当前消息暂时无法分享');
        return;
    }

    isSharing.value = true;
    try {
        const response = await shareMessages({
            messageIDs: shareableMessages.map((message) => String(message.id)),
        });

        if (!response.data.success) {
            throw new Error(response.data.error || '生成分享链接失败');
        }

        const resolved = router.resolve({
            name: 'Share',
            params: {
                shareId: response.data.share_id,
            },
        });
        shareLink.value = `${window.location.origin}${resolved.href}`;
        shareLinkCache.value.set(messageToShare.value, shareLink.value);
        await copyText(shareLink.value);
        toastSuccess('分享链接已生成并复制到剪贴板');
    } catch (error) {
        console.error('生成分享链接失败:', error);
        toastError('生成分享链接失败');
    } finally {
        isSharing.value = false;
    }
};

// 复制消息内容到剪贴板
const copyMessage = async (content: string) => {
    try {
        // 在复制之前移除 <model=xxx> 标签
        const cleanContent = content.replace(/<model=[^>]+>/g, "").trim();

        // 检查 navigator.clipboard 是否可用
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(cleanContent);
        } else {
            // 降级方案：使用传统的 execCommand 方法
            const textArea = document.createElement('textarea');
            textArea.value = cleanContent;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    toastSuccess("消息已复制到剪贴板");
                    document.body.removeChild(textArea);
                    return;
                }
            } catch (err) {
                console.error('execCommand 复制失败:', err);
            }

            document.body.removeChild(textArea);
            throw new Error('剪贴板 API 不可用');
        }

        toastSuccess("消息已复制到剪贴板");
    } catch (err) {
        console.error("复制失败:", err);
        toastError("无法复制消息到剪贴板");
    }
};

// 处理图片加载错误
const handleImageError = (event: Event) => {
    const imgElement = event.target as HTMLImageElement;
    console.error("图片加载失败:", imgElement.src);
    // 可以选择性地隐藏图片元素或显示替代文本
    imgElement.style.display = "none";
};

// 获取图片源，处理 Data URL 或纯 base64
const getImageSrc = (src: string) => {
    if (!src) return "";

    // 如果已经是 Data URL 格式（以 data:开头），直接返回
    if (src.startsWith("data:")) {
        return src;
    }

    // 如果是纯 base64 字符串，添加 Data URL 前缀
    // 首先尝试检测图片类型
    let imageType = "jpeg"; // 默认类型

    if (src.startsWith("/9j/")) {
        // JPEG 文件头
        imageType = "jpeg";
    } else if (src.startsWith("iVBORw0KGgo=")) {
        // PNG 文件头
        imageType = "png";
    } else if (src.startsWith("R0lGODlh") || src.startsWith("R0lGODdh")) {
        // GIF 文件头
        imageType = "gif";
    } else if (src.startsWith("TU0AK")) {
        // TIFF 文件头
        imageType = "tiff";
    }

    return `data:image/${imageType};base64,${src}`;
};

// 打开删除确认对话框
const openDeleteDialog = (messageId: number | undefined) => {
    if (messageId === undefined) return;

    messageToDelete.value = messageId;
    isDeleteDialogOpen.value = true;
};

// 确认删除消息
const confirmDeleteMessage = async () => {
    if (messageToDelete.value === null) return;

    try {
        // 关闭对话框
        isDeleteDialogOpen.value = false;

        // 调用 API 删除消息
        await deleteMessageAPIFunc(messageToDelete.value);

        // 从 store 中移除消息
        chatStore.removeMessage(messageToDelete.value);

        // 显示成功提示
        toastSuccess("消息已成功删除");

        // 重置待删除消息 ID
        messageToDelete.value = null;
    } catch (error) {
        console.error("删除消息失败:", error);
        // 显示错误提示
        toastError("删除消息时发生错误");
        // 重置待删除消息 ID
        messageToDelete.value = null;
    }
};

// 调用 API 删除消息
const deleteMessageAPIFunc = async (messageId: number) => {
    try {
        const response = await deleteMessageAPI({ messageID: messageId });
        if (!response.data.success) {
            throw new Error(response.data.error || "删除消息失败");
        }
    } catch (error) {
        console.error("删除消息 API 调用失败:", error);
        throw error;
    }
};

// WebSocket 生成状态 - 按对话 ID 存储
const wsGenerateStates = new Map<number, {
    messageAssistantId: number | null;
    accumulatedContent: string;
    accumulatedReasoningContent: string;
    lastReasoningTime: number;
}>();

// 获取当前对话的生成状态
const getWsGenerateState = (conversationId: number) => {
    if (!wsGenerateStates.has(conversationId)) {
        wsGenerateStates.set(conversationId, {
            messageAssistantId: null,
            accumulatedContent: "",
            accumulatedReasoningContent: "",
            lastReasoningTime: 0,
        });
    }
    return wsGenerateStates.get(conversationId)!;
};

// 保存当前的生成响应处理器引用，用于组件卸载时清理
let currentGenerateHandler: ((data: any) => void) | null = null;
let currentGenerateEndHandler: ((data: any) => void) | null = null;
let currentConnectedHandler: (() => void) | null = null;
let currentResumeStatusHandler: ((data: any) => void) | null = null;

// 全局生成响应处理器 - 处理 InputArea 发送的生成请求的响应
const setupGlobalGenerateHandler = () => {
    // 处理续流状态消息
    const handleResumeStatus = (data: any) => {
        console.log('[续流] 收到续流状态:', data);

        const convId = currentConversationId.value;
        if (isNaN(convId)) return;

        // 只在 resuming 状态时创建占位消息
        if (data.status === 'resuming') {
            // 检查是否已经有流式消息
            const messages = chatStore.getMessagesByConversationId(convId);
            const hasStreamingMessage = messages.some(msg => msg.role === 'assistant' && msg.isStreaming);

            if (!hasStreamingMessage) {
                // 创建续流占位消息
                console.log('[续流] 创建占位消息');
                const tempMessage = {
                    id: Date.now(), // 临时 ID
                    role: 'assistant' as const,
                    content: '',
                    reasoningContent: '',
                    reasoningTime: 0,
                    conversationID: convId,
                    createdAt: new Date().toISOString(),
                    isStreaming: true,
                    isHistory: false, // 续流消息不是历史消息，使用 DsMarkdownCMD
                };
                chatStore.addMessage(convId, tempMessage);

                // 更新状态中的 messageAssistantId
                const state = getWsGenerateState(convId);
                state.messageAssistantId = tempMessage.id;

                // 初始化打字状态
                const typingState = getTypingState(tempMessage.id);
                typingState.expectedContent = '';
                typingState.typedContent = '';
                typingState.isTyping = true;

                // 设置全局状态
                chatStore.setIsGenerating(true);
                chatStore.setIsTyping(true);

                console.log('[续流] 占位消息已创建，ID:', tempMessage.id);
            }
        }
        // streaming 状态不需要创建占位消息，只是表示生成正在进行
    };

    // 保存处理器引用并注册
    currentResumeStatusHandler = handleResumeStatus;
    wsManager.onMessage('resume_status', handleResumeStatus);

    currentGenerateHandler = (data: any) => {
        // 优先使用后端返回的 conversationID，避免路由切换时状态错位
        const convId = data.conversationID || currentConversationId.value;
        if (isNaN(convId)) {
            console.warn('当前对话 ID 无效');
            return;
        }

        const state = getWsGenerateState(convId);

        // 如果后端直接带回了 assistant 消息 ID，优先写入状态
        if (data.messageAssistantID && !state.messageAssistantId) {
            state.messageAssistantId = data.messageAssistantID;
        }
        if (data.isCached && !state.messageAssistantId) {
            const messages = chatStore.getMessagesByConversationId(convId);
            const lastAssistantMessage = messages.reverse().find(msg => msg.role === 'assistant' && msg.isStreaming);
            if (lastAssistantMessage && lastAssistantMessage.id) {
                state.messageAssistantId = lastAssistantMessage.id;
                console.log('[缓存消息] 找到续流占位消息，ID:', lastAssistantMessage.id);
            } else {
                console.warn('[缓存消息] 未找到续流占位消息，忽略');
                return;
            }
        }

        if (!state.messageAssistantId) {
            const messages = chatStore.getMessagesByConversationId(convId);
            const lastAssistantMessage = [...messages].reverse().find(msg => msg.role === 'assistant' && msg.isStreaming);
            if (lastAssistantMessage && lastAssistantMessage.id) {
                state.messageAssistantId = lastAssistantMessage.id;
                console.log('[generate_response] 从占位消息恢复 messageAssistantId:', lastAssistantMessage.id);
            }
        }

        if (!state.messageAssistantId) {
            console.warn('[generate_response] 没有设置 messageAssistantId，忽略响应');
            return;
        }

        if (data.success) {
            // 累加内容（缓存消息和流式消息处理方式相同）
            state.accumulatedContent += data.content || "";
            state.accumulatedReasoningContent += data.reasoningContent || "";
            if (data.reasoningTime !== undefined) {
                state.lastReasoningTime = data.reasoningTime;
            }

            // 更新助手消息
            chatStore.updateMessage(state.messageAssistantId, {
                content: state.accumulatedContent,
                reasoningContent: state.accumulatedReasoningContent,
                reasoningTime: state.lastReasoningTime,
                isStreaming: true,
            });

            // 更新打字状态的预期内容
            if (state.messageAssistantId) {
                const typingState = getTypingState(state.messageAssistantId);
                typingState.expectedContent = state.accumulatedContent;
                typingState.isTyping = true;
                // 同步更新全局 isTyping 状态
                chatStore.setIsTyping(true);
            }
        } else {
            console.error("服务器返回错误:", data.error);
            toastError(data.error || "生成失败", 15000); // 15 秒
            // 生成失败时，移除占位消息
            if (state.messageAssistantId) {
                chatStore.removeMessage(state.messageAssistantId);
            }
            chatStore.setIsGenerating(false);
        }
    };

    // 注册处理器
    wsManager.onMessage("generate_response", currentGenerateHandler);

    // 注册生成结束处理器
    currentGenerateEndHandler = async (data: any) => {
        console.log('[generate_end] 收到结束信号，原始数据:', data);

        // 优先使用后端返回的 conversationID，避免路由切换时状态错位
        const conversationId = data.conversationID || currentConversationId.value;
        if (!conversationId) {
            console.warn('[generate_end] 结束信号中没有 conversationID');
            return;
        }

        const state = getWsGenerateState(conversationId);

        console.log('[generate_end] 消息 ID:', state.messageAssistantId);

        // 设置消息为非流式状态（但不设置 isGenerating = false）
        // isGenerating 将在打字完成后由 handleTypedChar 设置为 false
        if (state.messageAssistantId) {
            chatStore.updateMessage(state.messageAssistantId, {
                isStreaming: false,
            });

            console.log('[generate_end] 已设置 isStreaming = false，等待打字完成');

            // 设置7.5秒超时，如果打字动画还没完成，强制设置 isTyping = false
            setTimeout(() => {
                const typingState = getTypingState(state.messageAssistantId!);
                if (typingState.isTyping) {
                    console.log('[generate_end] 打字超时，强制设置 isTyping = false');
                    typingState.isTyping = false;
                    chatStore.setIsTyping(false);
                    chatStore.setIsGenerating(false);
                }
            }, 7500);
        }

        // 显示积分扣除提示
        if (data.pointsDeducted && data.pointsDeducted > 0) {
            toastInfo(`使用对话模型扣除 ${data.pointsDeducted} 积分`, 5000);
        }

        // 重置该对话的状态
        wsGenerateStates.set(conversationId, {
            messageAssistantId: null,
            accumulatedContent: "",
            accumulatedReasoningContent: "",
            lastReasoningTime: 0,
        });
    };

    wsManager.onMessage("generate_end", currentGenerateEndHandler);

    // 注册 WebSocket 连接成功回调，发送当前对话 ID 进行续流检查
    currentConnectedHandler = () => {
        // 获取当前对话 ID
        const convId = currentConversationId.value;
        console.log('WebSocket 连接成功，当前对话 ID:', convId, '路由:', route.path);
        if (!isNaN(convId) && convId > 0) {
            // 发送对话 ID 给后端，让后端检查是否有进行中的对话
            console.log('发送 resume_check 请求');
            wsManager.send({
                type: 'resume_check',
                conversationID: convId,
            });
        } else {
            console.log('跳过 resume_check：对话 ID 无效');
        }
    };

    wsManager.onConnected(currentConnectedHandler);
};


/**
 * 从消息内容中提取模型名称
 */
const extractModelName = (content: string) => {
    if (!content) return null;

    // 匹配 <model=xxx> 格式的模型标识符
    const modelMatch = content.match(/<model=([^>]+)>/);
    if (modelMatch && modelMatch[1]) {
        const modelId = modelMatch[1];

        // 在模型列表中查找对应的名称
        const modelInfo = models.value.find((model) => model.id === modelId);
        const modelName = modelInfo ? modelInfo.name : modelId;

        return modelName;
    }

    return null;
};

// 加载对话历史消息（使用 HTTP）
const loadConversationHistory = async (conversationId: number) => {
    isLoading.value = true;
    try {
        const response = await getMessagesList({
            conversationID: conversationId,
        });
        if (response.data.success) {
            let parsedMessages = [];
            try {
                parsedMessages = JSON.parse(response.data.messages);
            } catch (parseError) {
                console.error("解析消息失败:", parseError);
                parsedMessages = [];
            }

            const formattedMessages = parsedMessages.map((msg: any) => {
                let reasoningContent = msg.reasoning_content || "";
                let reasoningTime = 0;

                if (!reasoningContent && msg.content) {
                    const thinkMatches = msg.content.matchAll(
                        /<think time=(\d+)>([\s\S]*?)<\/think>/g,
                    );
                    const contents = [];
                    for (const match of thinkMatches) {
                        contents.push(match[2]);
                        reasoningTime = Math.max(reasoningTime, parseInt(match[1]) || 0);
                    }
                    reasoningContent = contents.join("\n\n");
                }

                const cleanContent = msg.content
                    ? msg.content.replace(/<think time=\d+>[\s\S]*?<\/think>/g, "").trim()
                    : "";

                return {
                    id: msg.id,
                    conversationID: msg.conversation_id,
                    role: msg.role,
                    content: cleanContent,
                    base64: msg.base64,
                    reasoningContent,
                    reasoningTime,
                    createdAt: msg.created_at,
                    isStreaming: false,
                    disableTyping: true, // 历史消息不需要打字效果
                    isHistory: true, // 标记为历史消息，使用 DsMarkdown
                };
            });

            chatStore.setMessages(conversationId, formattedMessages);
            isLoading.value = false;

            // 增加已渲染完成计数
            renderedHistoryCount.value++;
        }
    } catch (error) {
        console.error("获取历史消息失败:", error);
        isLoading.value = false;
    }
};

// 加载当前对话
const loadCurrentConversation = async () => {
    const cPattern = /^\/c\/.+$/;
    if (cPattern.test(route.path)) {
        const pathParts = route.path.split("/");
        const conversationIdString = pathParts.length > 2 ? pathParts[2] : undefined;
        const conversationId = conversationIdString ? parseInt(conversationIdString) : NaN;

        if (!isNaN(conversationId)) {
            // 切换对话时，重置当前对话的生成状态
            const state = getWsGenerateState(conversationId);
            state.messageAssistantId = null;
            state.accumulatedContent = "";
            state.accumulatedReasoningContent = "";
            state.lastReasoningTime = 0;

            // 修改 URL 去掉 type 参数 (使用 history API 避免页面刷新)
            const typeParam = route.query.type;
            if (typeParam !== undefined) {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete("type");
                window.history.replaceState({}, "", newUrl.toString());
                emit("render-complete", true);
                console.log("emit: type=2")
            } else {
                // 加载历史消息
                await loadConversationHistory(conversationId);
            }
        }
    }
};

// 监听路由变化，加载新对话的历史消息
watch(
    () => route.path,
    () => {
        loadCurrentConversation();
    },
    { immediate: true } // 立即执行，包括初始加载时
);

/**
 * 挂载后获取模型列表并注册 WebSocket 处理器
 */
onMounted(async () => {
    // 首先获取模型列表
    try {
        const modelsResponse = await getModelsList();
        if (modelsResponse.data.models) {
            models.value = modelsResponse.data.models;
        }
    } catch (error) {
        console.error("[onMounted] 获取模型列表失败:", error);
    }

    // 注册全局 WebSocket 生成响应处理器
    setupGlobalGenerateHandler();

    // 显式调用 loadCurrentConversation，确保页面初始化时触发续流检查
    loadCurrentConversation();

    // 启动跟随底部循环
    runFollowBottomLoop();

    // 监听强制滚动事件
    window.addEventListener('force-scroll-to-bottom', handleForceScrollToBottom as EventListener);
});


// 在组件卸载时清理资源
onUnmounted(() => {
    // 清理 WebSocket 生成响应处理器
    if (currentGenerateHandler) {
        wsManager.offMessage("generate_response", currentGenerateHandler);
        currentGenerateHandler = null;
    }
    // 清理生成结束处理器
    if (currentGenerateEndHandler) {
        wsManager.offMessage("generate_end", currentGenerateEndHandler);
        currentGenerateEndHandler = null;
    }
    // 清理连接成功回调处理器
    if (currentConnectedHandler) {
        wsManager.offConnected(currentConnectedHandler);
        currentConnectedHandler = null;
    }
    // 清理续流状态处理器
    if (currentResumeStatusHandler) {
        wsManager.offMessage('resume_status', currentResumeStatusHandler);
        currentResumeStatusHandler = null;
    }

    // 清理滚动相关的资源
    if (followBottomFrameId.value !== undefined) {
        window.cancelAnimationFrame(followBottomFrameId.value);
    }

    // 移除事件监听器
    window.removeEventListener('force-scroll-to-bottom', handleForceScrollToBottom as EventListener);
});
</script>

<style scoped>
.user-message {
    background: #f3f4f6;
}

.dark .user-message {
    background: #262626;
}

.share-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.share-link-box {
    word-break: break-all;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    background-color: #f9fafb;
    color: #111827;
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
    line-height: 1.5;
}

.dark .share-link-box {
    border-color: #374151;
    background-color: #111827;
    color: #f3f4f6;
}

.share-dialog-placeholder {
    border-radius: 0.75rem;
    border: 1px dashed #d1d5db;
    color: #6b7280;
    padding: 1rem;
    font-size: 0.875rem;
    line-height: 1.5;
}

.dark .share-dialog-placeholder {
    border-color: #4b5563;
    color: #9ca3af;
}

.share-confirm-btn {
    background-color: var(--color-primary) !important;
    color: var(--color-white) !important;
}

.share-confirm-btn:hover {
    background-color: var(--color-primary-hover) !important;
}

.share-confirm-btn:disabled {
    background-color: var(--color-primary) !important;
}

.copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: #6b7280;
    /* text-gray-500 */
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
}

.message-action-icon {
    width: 1rem;
    height: 1rem;
}

.copy-btn:hover {
    color: #374151;
    /* hover:text-gray-700 */
    background-color: #e5e7eb;
    /* hover:bg-gray-200 */
}

.dark .copy-btn:hover {
    color: #d1d5db;
    /* dark:hover:text-gray-300 */
    background-color: #374151;
    /* dark:hover:bg-gray-700 */
}

.delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: #6b7280;
    /* text-gray-500 */
    border-radius: 50%;
    cursor: pointer;
    margin-left: 0.25rem;
    transition: all 0.2s ease;
}

.katex-inline {
    display: inline-block;
    vertical-align: middle;
}

.katex-block {
    display: block;
    margin: 1em 0;
    text-align: center;
}

.delete-btn:hover {
    color: var(--color-red-500);
    /* red-500 */
    background-color: #fee2e2;
    /* red-100 */
}

.dark .delete-btn:hover {
    color: #fecaca;
    /* dark:red-300 */
    background-color: #7f1d1d;
    /* dark:red-900 */
}

/* 滚动条样式 */
.messages-scroll-container {
    min-height: 100%;
}

.messages-scroll-container::-webkit-scrollbar {
    width: 8px;
}

.messages-scroll-container::-webkit-scrollbar-track {
    background: var(--scrollbar-track-bg);
}

.messages-scroll-container::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb-bg);
    border-radius: 4px;
}

.messages-scroll-container::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover-bg);
}

/* 深色模式滚动条样式 */
.dark .messages-scroll-container::-webkit-scrollbar {
    width: 8px;
}

.dark .messages-scroll-container::-webkit-scrollbar-track {
    background: #374151;
}

.dark .messages-scroll-container::-webkit-scrollbar-thumb {
    background: #525252;
    /* 灰色滚动条颜色，与 ConversationsContainer 保持一致 */
    border-radius: 4px;
}

.dark .messages-scroll-container::-webkit-scrollbar-thumb:hover {
    background: #404040;
    /* 深灰色悬停颜色，与 ConversationsContainer 保持一致 */
}
</style>
