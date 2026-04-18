<template>
    <div ref="containerRef" class="messages-scroll-container w-full h-full overflow-y-auto p-4">
        <div class="max-w-3xl mx-auto space-y-6">
            <!-- 加载动画 -->
            <div
                v-if="isLoading"
                class="flex justify-center items-center py-10"
            >
                <div
                    class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"
                ></div>
            </div>

            <!-- 消息列表 -->
            <div
                v-else
                v-for="(message, index) in displayedMessages"
                :key="message.id || index"
                class="flex flex-col"
                :class="message.role === 'user' ? 'items-end' : 'items-start'"
                @mouseenter="hoveredMessageId = message.id || null"
                @mouseleave="hoveredMessageId = null"
            >
                <div
                    :class="[
                        'rounded-lg px-4 py-3',
                        message.role === 'user'
                            ? 'bg-gray-100 dark:bg-user-msg-bg user-message'
                            : 'assistant-message',
                    ]"
                >
                    <!-- 用户消息 -->
                    <div v-if="message.role === 'user'">
                        <!-- 文本内容 -->
                        <div
                            v-if="message.content"
                            class="text-gray-800 dark:text-gray-200"
                            v-html="renderUserContent(message.content)"
                        ></div>

                        <!-- 图片附件 -->
                        <div v-if="message.base64" class="mt-2">
                            <img
                                :src="getImageSrc(message.base64)"
                                alt="上传的图片"
                                class="max-w-full h-auto rounded"
                                @error="handleImageError"
                            />
                        </div>
                    </div>

                    <!-- 助手消息 -->
                    <div v-else>
                        <!-- 模型名称显示 -->
                        <div
                            v-if="extractModelName(message.content)"
                            class="mb-2 text-sm text-gray-500 dark:text-gray-300"
                        >
                            {{ extractModelName(message.content) }}
                        </div>

                        <!-- 推理内容 -->
                        <ReasoningContent
                            v-if="message.reasoningContent"
                            :content="message.reasoningContent"
                            :reasoning-time="message.reasoningTime || 0"
                            :is-streaming="message.isStreaming || false"
                            :disable-typing="message.disableTyping || false"
                        />

                        <!-- 回复内容 - 根据 isHistory 字段选择组件 -->
                        <!-- 历史消息使用 DsMarkdown -->
                        <DsMarkdown
                            v-if="message.isHistory"
                            :content="message.content"
                            :interval="0"
                            :show-cursor="false"
                            :disable-typing="true"
                            cursor="circle"
                            :on-end="() => handleHistoryMessageEnd(message.id)"
                        />
                        <!-- 流式消息使用 DsMarkdownCMD -->
                        <DsMarkdownCMD
                            v-else-if="message.content || !message.isStreaming"
                            :content="message.content"
                            :interval="15"
                            :show-cursor="message.isStreaming"
                            cursor="circle"
                            :on-end="() => handleStreamingMessageEnd(message.id)"
                        />

                        <!-- 加载占位符 -->
                        <div
                            v-else-if="message.isStreaming"
                            class="inline-flex items-center space-x-1"
                        >
                            <div
                                class="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                                style="animation-duration: 0.6s"
                            ></div>
                            <div
                                class="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                                style="animation-duration: 0.6s; animation-delay: 0.1s"
                            ></div>
                            <div
                                class="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                                style="animation-duration: 0.6s; animation-delay: 0.2s"
                            ></div>
                        </div>
                    </div>
                </div>

                <!-- 消息操作按钮 -->
                <div
                    :class="[
                        'flex flex-row items-start mt-1',
                        message.role === 'user' ? 'mr-2' : 'ml-2',
                        hoveredMessageId === (message.id || null) ||
                        index === displayedMessages.length - 1
                            ? 'opacity-100'
                            : 'opacity-0',
                    ]"
                    v-show="
                        !(message.role === 'assistant' && message.isStreaming && !message.disableTyping)
                    "
                >
                    <button
                        @click="copyMessage(message.content)"
                        class="copy-btn"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                        <rect x="9" y="9" width="10" height="10" rx="2"></rect>
                        <path d="M5 15V7a2 2 0 0 1 2-2h8"></path>
                        </svg>
                    </button>

                    <button
                        @click="openDeleteDialog(message.id)"
                        class="delete-btn"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M3 6H5M5 6H21M5 6V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 20.1046 19 20V6H5ZM10 11V17M14 11V17M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6H8Z"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- 删除确认对话框 -->
            <Dialog
                :open="isDeleteDialogOpen"
                @update:open="isDeleteDialogOpen = $event"
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认删除</DialogTitle>
                        <DialogDescription>
                            确定要删除这条消息吗？此操作无法撤销。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button
                            @click="isDeleteDialogOpen = false"
                            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
                        >
                            取消
                        </button>
                        <button
                            @click="confirmDeleteMessage"
                            class="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none"
                        >
                            删除
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <!-- 占位消息，提示目前逻辑为空 -->
            <div
                v-if="!isLoading && displayedMessages.length === 0"
                class="text-center text-gray-500 dark:text-gray-400 py-10"
            >
                尚无消息，开始对话吧！
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from "vue";
import {
    deleteMessage as deleteMessageAPI,
    getModelsList,
    getMessagesList,
    wsManager,
} from "@/api/chat";
import { useRoute } from "vue-router";
import { useChatStore } from "@/stores/chat";
import ReasoningContent from "./ReasoningContent.vue";
import DsMarkdown from "./DsMarkdown.vue";
import DsMarkdownCMD from "./DsMarkdownCMD.vue";
import { toastSuccess, toastError, toastInfo } from "@/components/ui/toast/use-toast";
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
const chatStore = useChatStore();

// 状态变量
const isLoading = ref(false);
const hoveredMessageId = ref<number | null>(null);
const isDeleteDialogOpen = ref(false);
const messageToDelete = ref<number | null>(null);
const models = ref<any[]>([]);
// 跟踪哪些消息的 markdown 渲染已完成
const markdownEndedIds = ref<Set<number>>(new Set());

// 获取容器元素的引用
const containerRef = ref<HTMLElement | null>(null);

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
    // 为每条消息添加 markdownEnded 状态
    return messages.map(msg => ({
        ...msg,
        markdownEnded: markdownEndedIds.value.has(msg.id || -1),
    }));
});

/**
 * 滚动到容器底部
 * @param force 是否强制滚动到底部，默认为 false。为 true 时强制滚动，否则仅在用户已在底部时滚动
 */
const scrollToBottom = (force: boolean = false) => {
    if (!containerRef.value) return;
    
    if (force) {
        // 强制滚动到底部
        containerRef.value.scrollTop = containerRef.value.scrollHeight;
    } else {
        // 检查用户是否在底部（允许 100px 的误差范围）
        const isAtBottom = containerRef.value.scrollHeight - containerRef.value.scrollTop - containerRef.value.clientHeight < 100;
        if (isAtBottom) {
            containerRef.value.scrollTop = containerRef.value.scrollHeight;
        }
    }
};

/**
 * 处理历史消息的 onEnd 回调
 * 历史消息渲染完成后强制滚动到底部
 * @param messageId 消息 ID
 */
const handleHistoryMessageEnd = (messageId: number | undefined) => {
    if (messageId === undefined) return;
    
    console.log('[handleHistoryMessageEnd] 历史消息渲染完成，消息 ID:', messageId);
    
    // 强制滚动到底部
    setTimeout(() => {
        scrollToBottom(true);
    }, 200);
    setTimeout(() => {
        scrollToBottom(true);
    }, 400);
    setTimeout(() => {
        scrollToBottom(true);
    }, 600);
};

/**
 * 处理流式消息的 onEnd 回调
 * MarkdownCMD 的 onEnd 会在每次 push() 的内容打完后触发
 * 只有当 WebSocket 已发送 generate_end（isStreaming=false）后才执行后续逻辑
 * @param messageId 消息 ID
 */
const handleStreamingMessageEnd = (messageId: number | undefined) => {
    if (messageId === undefined) return;

    // 获取消息对象，检查是否还在流式传输中
    const message = displayedMessages.value.find(msg => msg.id === messageId);
    if (!message) return;

    // 如果消息还在流式传输中（WebSocket 还没发送 generate_end），不做任何处理
    // 因为 MarkdownCMD 的 onEnd 会在每次 push() 的内容打完后触发
    if (message.isStreaming) {
        console.log('[handleStreamingMessageEnd] 消息还在流式传输中，跳过处理，消息 ID:', messageId);
        return;
    }

    console.log('[handleStreamingMessageEnd] 流式消息打字完成，消息 ID:', messageId);

    // 先标记该消息的 markdown 渲染已完成
    markdownEndedIds.value.add(messageId);

    // 立即检查是否还有活跃的流式消息（不延迟）
    // 只检查 isStreaming=true 的消息，因为历史消息（disableTyping=true）不需要等待
    const hasActiveStreaming = displayedMessages.value.some(
        msg => msg.role === 'assistant' && msg.id !== messageId && msg.isStreaming
    );

    console.log('[handleStreamingMessageEnd] 检查结果:', {
        hasActiveStreaming,
        currentMessageId: messageId,
        allMessages: displayedMessages.value.map(m => ({
            id: m.id,
            role: m.role,
            isStreaming: m.isStreaming,
            disableTyping: m.disableTyping,
            content: m.content?.substring(0, 20) + '...'
        }))
    });

    // 如果没有活跃的流式消息，设置 isGenerating = false
    if (!hasActiveStreaming) {
        console.log('[handleStreamingMessageEnd] 设置 isGenerating = false');
        chatStore.setIsGenerating(false);
    }

    // 延迟滚动，确保 DOM 完全渲染
    setTimeout(() => {
        scrollToBottom();
    }, 40);
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
        console.log('收到续流状态:', data);
        
        const convId = currentConversationId.value;
        if (isNaN(convId)) return;
        
        if (data.status === 'resuming' || data.status === 'streaming') {
            // 检查是否已经有流式消息
            const messages = chatStore.getMessagesByConversationId(convId);
            const hasStreamingMessage = messages.some(msg => msg.role === 'assistant' && msg.isStreaming);
            
            if (!hasStreamingMessage) {
                // 创建占位消息，messageAssistantId 会在收到第一条缓存消息时设置
                console.log('续流：创建占位消息');
                // 创建一个临时的 assistant 消息作为占位符
                const tempMessage = {
                    id: Date.now(), // 临时 ID
                    role: 'assistant' as const,
                    content: '',
                    reasoningContent: '',
                    reasoningTime: 0,
                    conversationID: convId,
                    createdAt: new Date().toISOString(),
                    isStreaming: true,
                    disableTyping: false, // 续流需要打字效果
                };
                chatStore.addMessage(convId, tempMessage);
                // 更新状态中的 messageAssistantId
                const state = getWsGenerateState(convId);
                state.messageAssistantId = tempMessage.id;
            }
        }
    };
    
    // 保存处理器引用并注册
    currentResumeStatusHandler = handleResumeStatus;
    wsManager.onMessage('resume_status', handleResumeStatus);

    currentGenerateHandler = (data: any) => {
        // 获取当前对话 ID
        const convId = currentConversationId.value;
        if (isNaN(convId)) {
            console.warn('当前对话 ID 无效');
            return;
        }

        const state = getWsGenerateState(convId);

        // 如果是缓存消息，需要先设置 messageAssistantId
        if (data.isCached && !state.messageAssistantId) {
            // 从聊天 store 中查找最后一个 assistant 消息
            const messages = chatStore.getMessagesByConversationId(convId);
            const lastAssistantMessage = messages.reverse().find(msg => msg.role === 'assistant' && msg.isStreaming);
            if (lastAssistantMessage && lastAssistantMessage.id) {
                state.messageAssistantId = lastAssistantMessage.id;
            } else {
                // 如果找不到对应的 assistant 消息，直接添加新消息
                console.warn('缓存消息未找到对应的 assistant 消息，直接添加新消息');
                chatStore.addMessage(convId, {
                    id: Date.now(), // 临时 ID
                    role: 'assistant' as const,
                    content: data.content || '',
                    reasoningContent: data.reasoningContent || '',
                    reasoningTime: data.reasoningTime || 0,
                    conversationID: convId,
                    createdAt: new Date().toISOString(),
                    isStreaming: false, // 缓存消息不是流式
                    disableTyping: true, // 缓存消息不需要打字效果
                });
                return; // 直接返回，不执行后续的 updateMessage
            }
        }

        if (!state.messageAssistantId) {
            console.warn('没有设置 messageAssistantId，忽略响应');
            return;
        }

        if (data.success) {
            // 区分缓存消息和正常流式消息的处理方式
            if (data.isCached) {
                // 缓存消息：累加内容（因为缓存可能分多条发送）
                state.accumulatedContent += data.content || "";
                state.accumulatedReasoningContent += data.reasoningContent || "";
                if (data.reasoningTime !== undefined) {
                    state.lastReasoningTime = data.reasoningTime;
                }
            } else {
                // 正常流式消息：累加内容
                state.accumulatedContent += data.content || "";
                state.accumulatedReasoningContent += data.reasoningContent || "";
                if (data.reasoningTime !== undefined) {
                    state.lastReasoningTime = data.reasoningTime;
                }
            }

            // 更新助手消息
            chatStore.updateMessage(state.messageAssistantId, {
                content: state.accumulatedContent,
                reasoningContent: state.accumulatedReasoningContent,
                reasoningTime: state.lastReasoningTime,
                isStreaming: true,
            });
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
    currentGenerateEndHandler = (data: any) => {
        // 从结束信号中获取 conversationID
        const conversationId = data.conversationID;
        if (!conversationId) {
            console.warn('结束信号中没有 conversationID');
            return;
        }

        const state = getWsGenerateState(conversationId);

        // 设置消息为非流式状态（但 markdown 还未结束）
        // 注意：不在这里设置 isGenerating = false，而是等待 markdown 的 onEnd 回调后再设置
        if (state.messageAssistantId) {
            // 延迟一小会儿设置 isStreaming = false，确保最后的 push 已经完成
            const assistantId = state.messageAssistantId;
            setTimeout(() => {
                chatStore.updateMessage(assistantId, {
                    isStreaming: false,
                });
            }, 100);
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

        // 注意：不再在这里设置 isGenerating = false
        // 而是在 markdown 的 onEnd 回调中设置
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

// 监听消息变化，自动滚动到底部
// 在流式消息存在且 markdown 未结束之前持续滚动
watch(
    displayedMessages,
    (newMessages) => {
        nextTick(() => {
            // 检查是否有正在进行流式传输或 markdown 未结束的消息
            const hasActiveStreaming = newMessages.some(
                msg => msg.role === 'assistant' && (msg.isStreaming || !msg.markdownEnded)
            );
            
            // 如果有活跃的消息（流式中或 markdown 未结束），继续滚动
            if (hasActiveStreaming) {
                scrollToBottom();
            }
        });
    },
    { deep: true },
);

// 监听 chatStore 中的消息更新，检查是否有流式消息但 markdownEndedIds 中不存在的情况
// 这种情况发生在切换对话或页面刷新时
watch(
    () => chatStore.messages,
    (newMessages) => {
        const convId = currentConversationId.value;
        if (isNaN(convId)) return;
        
        const messages = newMessages[convId];
        if (!messages || messages.length === 0) return;
        
        // 检查是否有流式消息但不在 markdownEndedIds 中
        const streamingMessage = messages.find(
            msg => msg.role === 'assistant' && msg.isStreaming && !markdownEndedIds.value.has(msg.id || -1)
        );
        
        if (streamingMessage) {
            // 这是一个新的流式消息，确保它不在 markdownEndedIds 中
            // （正常情况下不应该在，但为了安全起见）
            markdownEndedIds.value.delete(streamingMessage.id || -1);
        }
    },
    { deep: true },
);

// 监听 store 中的消息变化，当有新的流式消息时设置 wsGenerateState
watch(
    () => chatStore.messages,
    (newMessages) => {
        // 获取当前对话 ID
        const convId = currentConversationId.value;
        if (isNaN(convId)) return;

        // 获取当前对话的消息
        const messages = newMessages[convId];
        if (!messages || messages.length === 0) return;

        // 找到最新的流式消息
        const streamingMessage = messages.find(msg => msg.isStreaming && msg.role === 'assistant');
        if (streamingMessage && streamingMessage.id) {
            // 设置该对话的 wsGenerateState
            const state = getWsGenerateState(convId);
            if (state.messageAssistantId !== streamingMessage.id) {
                state.messageAssistantId = streamingMessage.id;
                state.accumulatedContent = "";
                state.accumulatedReasoningContent = "";
                state.lastReasoningTime = 0;
            }
        }
    },
    { deep: true },
);

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
            
            // 等待 DOM 渲染完成后强制滚动到底部
            // 使用多次 nextTick 确保所有 DsMarkdown 组件都已渲染
            await nextTick();
            await nextTick();
            scrollToBottom(true);
            
            // 再次延迟滚动，确保长消息完全渲染
            //setTimeout(() => {
            //    scrollToBottom(true);
            //}, 150);
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
            }

            // 加载历史消息
            await loadConversationHistory(conversationId);

            // 注意：页面刷新时不再主动通过 thread_list 检查未完成的对话
            // 续流逻辑由 WebSocket 连接时的 resume_check 处理：
            // - WebSocket 连接建立后，后端会主动检查并推送缓存内容
            // - 前端不需要在此处发送 generate 请求
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

    // 监听强制滚动事件（来自 InputArea 发送新消息）
    window.addEventListener('force-scroll-to-bottom', () => {
        scrollToBottom(true);
    });
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
});
</script>

<style scoped>
.user-message {
  background: #f3f4f6;
}

.dark .user-message {
  background: #262626;
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
  background: #525252; /* 灰色滚动条颜色，与 ConversationsContainer 保持一致 */
  border-radius: 4px;
}

.dark .messages-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #404040; /* 深灰色悬停颜色，与 ConversationsContainer 保持一致 */
}
</style>
