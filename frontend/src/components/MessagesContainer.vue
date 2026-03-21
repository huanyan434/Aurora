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
                        'rounded-lg px-4 py-3 markdown-body',
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
                        />

                        <!-- 回复内容 -->
                        <div
                            v-if="message.content || !message.isStreaming"
                            class="text-gray-800 dark:text-gray-200"
                            v-html="renderContent(message.content)"
                        ></div>

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
                        !(message.role === 'assistant' && message.isStreaming)
                    "
                >
                    <button
                        @click="copyMessage(message.content)"
                        class="copy-btn"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 699.428 699.428"
                            fill="currentColor"
                        >
                            <path
                                d="M502.714,0c-2.71,0-262.286,0-262.286,0C194.178,0,153,42.425,153,87.429l-25.267,0.59
c-46.228,0-84.019,41.834-84.019,86.838V612c0,45.004,41.179,87.428,87.429,87.428H459c46.249,0,87.428-42.424,87.428-87.428
h21.857c46.25,0,87.429-42.424,87.429-87.428v-349.19L502.714,0z M459,655.715H131.143c-22.95,0-43.714-21.441-43.714-43.715
V174.857c0-22.272,18.688-42.993,41.638-42.993L153,131.143v393.429C153,569.576,194.178,612,240.428,612h262.286
C502.714,634.273,481.949,655.715,459,655.715z M612,524.572c0,22.271-20.765,43.713-43.715,43.713H240.428
c-22.95,0-43.714-21.441-43.714-43.713V87.429c0-22.272,20.764-43.714,43.714-43.714L153,131.143c0,0,23.213,0,65.572,0V524.572z M546.428,174.857c-23.277,0-43.714-42.293-43.714-64.981
c0,0,0-22.994,0-65.484v-0.044L612,174.857H546.428z M502.714,306.394H306c-12.065,0-21.857,9.77-21.857,21.835
c0,12.065,9.792,21.835,21.857,21.835h196.714c12.065,0,21.857-9.771,21.857-21.835
C524.571,316.164,514.779,306.394,502.714,306.394z M502.714,415.57H306c-12.065,0-21.857,9.77-21.857,21.834
c0,12.066,9.792,21.836,21.857,21.836h196.714c12.065,0,21.857-9.77,21.857-21.836C524.571,425.34,514.779,415.57,502.714,415.57
z"
                            />
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
import { marked } from "marked";
import katex from "katex";
import "@/github-markdown.css";
import { useChatStore } from "@/stores/chat";
import ReasoningContent from "./ReasoningContent.vue";
import { toastSuccess, toastError } from "@/components/ui/toast/use-toast";
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
    return chatStore.getMessagesByConversationId(convId) || [];
});

/**
 * 滚动到容器底部
 */
const scrollToBottom = () => {
    if (containerRef.value) {
        containerRef.value.scrollTop = containerRef.value.scrollHeight;
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

/**
 * 渲染内容（包括 Markdown 和 LaTeX 数学公式）
 * @param content 原始内容
 * @returns 渲染后的 HTML
 */
const renderContent = (content: string) => {
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

    // 移除模型标识符和推理内容
    processedContent = processedContent.replace(/<model=[^>]+>/g, "").trim();
    processedContent = processedContent
        .replace(/<think time=(\d+)>([\s\S]*?)<\/think>/g, "")
        .trim();

    // 使用 marked 库解析 markdown
    const renderer = new marked.Renderer();

    // 自定义链接渲染以确保安全性
    renderer.link = ({ href, title, text }) => {
        // 确保链接是安全的协议
        const sanitizedHref =
            href && (href.startsWith("http://") || href.startsWith("https://"))
                ? href
                : `https://${href || ""}`;
        const titleAttr = title ? ` title="${title}"` : "";
        return `<a href="${sanitizedHref}"${titleAttr} target="_blank" rel="noopener noreferrer">${text || ""}</a>`;
    };

    // 自定义图片渲染以确保安全性
    renderer.image = ({ href, title, text }) => {
        // 只允许安全的图片链接
        const sanitizedHref =
            href && (href.startsWith("http://") || href.startsWith("https://"))
                ? href
                : "";
        const sanitizedText = text || "";
        const titleAttr = title ? ` title="${title}"` : "";
        return sanitizedHref
            ? `<img src="${sanitizedHref}" alt="${sanitizedText}"${titleAttr} class="max-w-full h-auto">`
            : "";
    };

    // 自定义代码块渲染
    renderer.code = ({ text, lang, escaped }) => {
        // 如果内容已经被转义，则直接使用；否则可能需要转义特殊字符
        const codeContent = escaped ? text : text; // 在实际应用中可能需要使用转义函数
        return `<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded my-2 overflow-x-auto"><code class="language-${lang || "text"}">${codeContent}</code></pre>`;
    };

    // 自定义行内代码渲染
    renderer.codespan = ({ text }) => {
        return `<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono text-sm">${text}</code>`;
    };

    // 自定义列表项渲染
    renderer.listitem = (item) => {
        const text = item.text || "";
        const task = item.task || false;
        const checked = item.checked || false;

        if (task) {
            // 如果是任务列表项，添加复选框
            const checkedAttr = checked ? " checked" : "";
            return `<li class="ml-4"><input type="checkbox" disabled${checkedAttr}> ${text}</li>`;
        }
        return `<li class="ml-4">${text}</li>`;
    };

    // 自定义表格单元格渲染
    renderer.tablecell = (token) => {
        // 安全地访问内容，避免未定义错误
        let content = "";
        if (
            token.tokens &&
            Array.isArray(token.tokens) &&
            token.tokens.length > 0
        ) {
            const firstToken = token.tokens[0];
            if (firstToken && typeof firstToken === "object") {
                content =
                    "text" in firstToken
                        ? firstToken.text || ""
                        : "content" in firstToken
                          ? firstToken.content || ""
                          : "";
            }
        } else {
            content = token.text || "";
        }

        const header = "header" in token ? token.header : undefined;
        const align = "align" in token ? token.align : undefined;
        const tag = header ? "th" : "td";
        const alignStyle = align ? ` text-align:${align};` : "";
        return `<${tag} style="border:1px solid #ccc; padding:4px;${alignStyle}">${content}</${tag}>`;
    };

    // 配置 marked 选项
    marked.setOptions({
        renderer: renderer,
        gfm: true, // 启用 GitHub 风格的 Markdown
        breaks: true, // 启用换行符转换为 <br> 标签
    });

    processedContent = marked.parse(processedContent) as string;

    // 处理 LaTeX 数学公式
    // 行内公式：$...$
    processedContent = processedContent.replace(
        /\$(.*?)\$/g,
        (match, formula) => {
            try {
                // 清理公式内容，去除首尾空白
                const cleanedFormula = formula.trim();
                if (!cleanedFormula) return match; // 如果公式为空，返回原始内容

                const rendered = katex.renderToString(cleanedFormula, {
                    throwOnError: false,
                    displayMode: true,
                    output: "html",
                });
                // 添加 KaTeX 相关的 CSS 类以确保正确显示
                return `${rendered}`;
            } catch (error) {
                console.warn("LaTeX parsing error (inline):", error);
                // 如果解析失败，返回原始内容
                return match;
            }
        },
    );

    // 块级公式：$$...$$
    processedContent = processedContent.replace(
        /\$\$(.*?)\$\$/gs,
        (match, formula) => {
            try {
                // 清理公式内容，去除首尾空白
                const cleanedFormula = formula.trim();
                if (!cleanedFormula) return match; // 如果公式为空，返回原始内容

                const rendered = katex.renderToString(cleanedFormula, {
                    throwOnError: false,
                    displayMode: false,
                    output: "html",
                });
                return rendered;
            } catch (error) {
                console.warn("LaTeX parsing error (block):", error);
                // 如果解析失败，返回原始内容
                return match;
            }
        },
    );

    // 处理 [... ] 格式的块级公式（常见于 AI 输出）
    processedContent = processedContent.replace(
        /\[([^\[\]]*)\]/g,
        (match, formula) => {
            try {
                // 清理公式内容，去除首尾空白
                const cleanedFormula = formula.trim();
                if (!cleanedFormula) return match; // 如果公式为空，返回原始内容

                // 检查是否包含常见的 LaTeX 命令
                if (!formula.includes("\\")) {
                    return match; // 如果不包含 LaTeX 命令，不处理
                }

                // 预处理一些常见的非标准 LaTeX 语法和清理意外字符
                let processedFormula = cleanedFormula
                    .replace(/\\+$/, "") // 移除末尾多余的反斜杠
                    .replace(/^\s*\\/, "") // 移除开头的意外反斜杠
                    .trim(); // 再次清理空白

                // 检查处理后的公式是否仍然包含 LaTeX 命令
                if (!processedFormula.includes("\\")) {
                    return match; // 如果处理后不再包含 LaTeX 命令，不处理
                }

                const rendered = katex.renderToString(processedFormula, {
                    throwOnError: false,
                    displayMode: true, // 使用 display 模式渲染方括号公式
                    output: "html",
                });
                return rendered;
            } catch (error) {
                console.error("LaTeX parsing error ([...]):", error);
                console.log("Problematic formula:", formula);
                // 如果解析失败，返回原始内容
                return match;
            }
        },
    );

    return processedContent;
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

// 全局生成响应处理器 - 处理 InputArea 发送的生成请求的响应
const setupGlobalGenerateHandler = () => {
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
                console.warn('缓存消息未找到对应的 assistant 消息，忽略响应');
                return;
            }
        }

        if (!state.messageAssistantId) {
            console.warn('没有设置 messageAssistantId，忽略响应');
            return;
        }

        if (data.success) {
            // 区分缓存消息和正常流式消息的处理方式
            if (data.isCached) {
                // 缓存消息：覆盖内容而不是累加，避免重复
                state.accumulatedContent = data.content || "";
                state.accumulatedReasoningContent = data.reasoningContent || "";
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

        // 设置消息为非流式状态
        if (state.messageAssistantId) {
            chatStore.updateMessage(state.messageAssistantId, {
                isStreaming: false,
            });
        }

        // 重置该对话的状态
        wsGenerateStates.set(conversationId, {
            messageAssistantId: null,
            accumulatedContent: "",
            accumulatedReasoningContent: "",
            lastReasoningTime: 0,
        });

        // 设置全局生成状态为 false
        chatStore.setIsGenerating(false);
    };

    wsManager.onMessage("generate_end", currentGenerateEndHandler);

    // 注册 WebSocket 连接成功回调，发送当前对话 ID 进行续流检查
    currentConnectedHandler = () => {
        // 获取当前对话 ID
        const convId = currentConversationId.value;
        if (!isNaN(convId) && convId > 0) {
            // 发送对话 ID 给后端，让后端检查是否有进行中的对话
            wsManager.send({
                type: 'resume_check',
                conversationID: convId,
            });
        }
    };

    wsManager.onConnected(currentConnectedHandler);
};

// 监听消息变化，自动滚动到底部
watch(
    displayedMessages,
    () => {
        nextTick(() => {
            scrollToBottom();
        });
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
                };
            });

            chatStore.setMessages(conversationId, formattedMessages);
            isLoading.value = false;
            await nextTick();
            scrollToBottom();
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

            // 检查是否存在 type 参数且为数字
            const typeParam = route.query.type;
            let typeValue: number | undefined;

            if (typeParam !== undefined) {
                const parsedType = Number(typeParam);
                if (!isNaN(parsedType)) {
                    typeValue = parsedType;
                }
            }

            // 修改 URL 去掉 type 参数 (使用 history API 避免页面刷新)
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
});
</script>

<style scoped>
.markdown-body hr {
    height: 0 !important;
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
    color: #ef4444;
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

/* 使用新的深色模式变量覆盖默认背景 */
.dark .markdown-body.user-message {
  background-color: var(--user-msg-bg) !important;
}

/* 滚动条样式 */
.messages-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.messages-scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.messages-scroll-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.messages-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
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
