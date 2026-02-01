<template>
    <div ref="containerRef" class="w-full h-full overflow-y-auto p-4">
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
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'bg-white dark:bg-gray-900',
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
                            class="flex space-x-2"
                        >
                            <div
                                class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce"
                            ></div>
                            <div
                                class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce"
                                style="animation-delay: 0.2s"
                            ></div>
                            <div
                                class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce"
                                style="animation-delay: 0.4s"
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
c-22.95,0-43.714-21.441-43.714-43.713V87.429c0-22.272,20.764-43.714,43.714-43.714H459c-0.351,50.337,0,87.975,0,87.975
c0,45.419,40.872,86.882,87.428,86.882c0,0,23.213,0,65.572,0V524.572z M546.428,174.857c-23.277,0-43.714-42.293-43.714-64.981
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
    getMessagesList,
    deleteMessage as deleteMessageAPI,
    getThreadList,
    getModelsList,
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

// 定义消息类型
interface DisplayMessage {
    id?: number;
    role: "user" | "assistant";
    content: string;
    base64?: string;
    reasoningContent?: string;
    reasoningTime?: number;
    isStreaming?: boolean;
}

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

// 计算属性：获取当前对话的消息
const conversationMessages = computed(() => {
    // 从路由参数获取对话ID
    const routeParams = route.params.conversationId;
    let conversationId: number | null = null;

    if (typeof routeParams === "string") {
        conversationId = parseInt(routeParams);
    } else if (Array.isArray(routeParams) && routeParams.length > 0) {
        // 修复类型检查问题
        const param = routeParams[0];
        if (param !== undefined) {
            conversationId = parseInt(param);
        }
    }

    // 如果成功解析出有效的对话ID，则返回对应消息
    if (conversationId !== null && !isNaN(conversationId)) {
        return chatStore.getMessagesByConversationId(conversationId);
    }

    // 否则返回空数组
    return [];
});

// 计算属性：处理显示的消息
const displayedMessages = computed(() => {
    return conversationMessages.value.map((msg): DisplayMessage => {
        // 解析历史消息中的推理内容
        let reasoningContent = msg.reasoningContent;
        let reasoningTime = msg.reasoningTime || 0;

        // 如果没有独立的推理内容字段，尝试从内容中提取
        if (!reasoningContent && msg.content) {
            // 提取内容中的推理部分
            const thinkMatches = msg.content.matchAll(
                /<think time=(\d+)>([\s\S]*?)<\/think>/g,
            );
            const contents = [];
            for (const match of thinkMatches) {
                contents.push(match[2]);
                // 获取最后一个推理时间
                reasoningTime = match[1] ? parseInt(match[1]) || 0 : 0;
            }

            if (contents.length > 0) {
                reasoningContent = contents.join("");
            }
        }

        return {
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            base64: msg.base64,
            reasoningContent: reasoningContent,
            reasoningTime: reasoningTime,
            isStreaming: msg.isStreaming,
        };
    });
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
 * 渲染用户消息内容（仅处理base64图片标签）
 * @param content 原始内容
 * @returns 处理后的HTML
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
                // 验证base64格式
                const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                if (base64Regex.test(trimmedContent)) {
                    // 如果是有效的base64，创建图片标签
                    // 尝试检测图片类型，如果没有检测到则默认使用jpeg
                    let imageType = "jpeg"; // 默认类型

                    // 检查base64字符串是否包含图片类型信息
                    if (trimmedContent.startsWith("/9j/")) {
                        // JPEG文件头
                        imageType = "jpeg";
                    } else if (trimmedContent.startsWith("iVBORw0KGgo=")) {
                        // PNG文件头
                        imageType = "png";
                    } else if (
                        trimmedContent.startsWith("R0lGODlh") ||
                        trimmedContent.startsWith("R0lGODdh")
                    ) {
                        // GIF文件头
                        imageType = "gif";
                    } else if (trimmedContent.startsWith("TU0AK")) {
                        // TIFF文件头
                        imageType = "tiff";
                    }

                    return `<img src="data:image/${imageType};base64,${trimmedContent}" alt="嵌入图片" class="max-w-full h-auto rounded border border-gray-300 dark:border-gray-700" onerror="this.style.display='none'" onload="this.style.display='block'" />`;
                } else {
                    // 如果不是有效的base64，返回空字符串（移除标签）
                    console.warn(
                        "Invalid base64 format detected and removed:",
                        trimmedContent,
                    );
                    return ""; // 返回空字符串，移除无效标签
                }
            }
        },
    );

    // 转义HTML以防止XSS攻击，但保留已处理的图片标签
    const escapeHtml = (unsafe: string) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // 分割内容，对非图片部分进行HTML转义
    const parts = processedContent.split(/(<img\s[^>]*>)/gi);
    const escapedParts = parts.map((part) => {
        if (part.toLowerCase().startsWith("<img")) {
            // 如果是图片标签，不进行转义
            return part;
        } else {
            // 如果是非图片内容，进行HTML转义
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
                // 验证base64格式
                const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                if (base64Regex.test(trimmedContent)) {
                    // 如果是有效的base64，创建图片标签
                    // 尝试检测图片类型，如果没有检测到则默认使用jpeg
                    let imageType = "jpeg"; // 默认类型

                    // 检查base64字符串是否包含图片类型信息
                    if (trimmedContent.startsWith("/9j/")) {
                        // JPEG文件头
                        imageType = "jpeg";
                    } else if (trimmedContent.startsWith("iVBORw0KGgo=")) {
                        // PNG文件头
                        imageType = "png";
                    } else if (
                        trimmedContent.startsWith("R0lGODlh") ||
                        trimmedContent.startsWith("R0lGODdh")
                    ) {
                        // GIF文件头
                        imageType = "gif";
                    } else if (trimmedContent.startsWith("TU0AK")) {
                        // TIFF文件头
                        imageType = "tiff";
                    }

                    return `<img src="data:image/${imageType};base64,${trimmedContent}" alt="嵌入图片" class="max-w-full h-auto rounded border border-gray-300 dark:border-gray-700" onerror="this.style.display='none'" onload="this.style.display='block'" />`;
                } else {
                    // 如果不是有效的base64，返回空字符串（移除标签）
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
                // 添加KaTeX相关的CSS类以确保正确显示
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

    // 处理 [ ... ] 格式的块级公式（常见于AI输出）
    processedContent = processedContent.replace(
        /\[([^\[\]]*)\]/g,
        (match, formula) => {
            try {
                // 清理公式内容，去除首尾空白
                const cleanedFormula = formula.trim();
                if (!cleanedFormula) return match; // 如果公式为空，返回原始内容

                // 检查是否包含常见的LaTeX命令
                if (!formula.includes("\\")) {
                    return match; // 如果不包含LaTeX命令，不处理
                }

                // 预处理一些常见的非标准LaTeX语法和清理意外字符
                let processedFormula = cleanedFormula
                    .replace(/\\+$/, "") // 移除末尾多余的反杠
                    .replace(/^\s*\\/, "") // 移除开头的意外反杠
                    .trim(); // 再次清理空白

                // 检查处理后的公式是否仍然包含LaTeX命令
                if (!processedFormula.includes("\\")) {
                    return match; // 如果处理后不再包含LaTeX命令，不处理
                }

                const rendered = katex.renderToString(processedFormula, {
                    throwOnError: false,
                    displayMode: true, // 使用display模式渲染方括号公式
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
        await navigator.clipboard.writeText(content);
        toastSuccess("消息已复制到剪贴板");
    } catch (err) {
        toastError("无法复制消息到剪贴板");
        console.error("复制失败:", err);
    }
};

// 处理图片加载错误
const handleImageError = (event: Event) => {
    const imgElement = event.target as HTMLImageElement;
    console.error("图片加载失败:", imgElement.src);
    // 可以选择性地隐藏图片元素或显示替代文本
    imgElement.style.display = "none";
};

// 获取图片源，处理Data URL或纯base64
const getImageSrc = (src: string) => {
    if (!src) return "";

    // 如果已经是Data URL格式（以data:开头），直接返回
    if (src.startsWith("data:")) {
        return src;
    }

    // 如果是纯base64字符串，添加Data URL前缀
    // 首先尝试检测图片类型
    let imageType = "jpeg"; // 默认类型

    if (src.startsWith("/9j/")) {
        // JPEG文件头
        imageType = "jpeg";
    } else if (src.startsWith("iVBORw0KGgo=")) {
        // PNG文件头
        imageType = "png";
    } else if (src.startsWith("R0lGODlh") || src.startsWith("R0lGODdh")) {
        // GIF文件头
        imageType = "gif";
    } else if (src.startsWith("TU0AK")) {
        // TIFF文件头
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

        // 调用API删除消息
        await deleteMessageAPIFunc(messageToDelete.value);

        // 从store中移除消息
        chatStore.removeMessage(messageToDelete.value);

        // 显示成功提示
        toastSuccess("消息已成功删除");

        // 重置待删除消息ID
        messageToDelete.value = null;
    } catch (error) {
        console.error("删除消息失败:", error);
        // 显示错误提示
        toastError("删除消息时发生错误");
        // 重置待删除消息ID
        messageToDelete.value = null;
    }
};

// 调用API删除消息
const deleteMessageAPIFunc = async (messageId: number) => {
    try {
        const response = await deleteMessageAPI({ messageID: messageId });
        if (!response.data.success) {
            throw new Error(response.data.error || "删除消息失败");
        }
    } catch (error) {
        console.error("删除消息API调用失败:", error);
        throw error;
    }
};

// 处理流式响应的函数
// 用于跟踪每个对话的abort控制器
const abortControllers = new Map<number, AbortController>();

const handleStreamedGenerate = async (
    conversationId: number,
    messageUserId: number,
    messageAssistantId: number,
) => {
    // 创建新的AbortController并存储
    const abortController = new AbortController();
    abortControllers.set(conversationId, abortController);

    try {
        // 添加占位助手消息
        chatStore.addMessage(conversationId, {
            id: messageAssistantId,
            role: "assistant", // 修复类型错误
            content: "",
            conversationID: conversationId,
            createdAt: new Date().toISOString(),
            reasoningContent: "",
            reasoningTime: 0,
            isStreaming: true,
        });

        // 使用 fetch + ReadableStream 处理 SSE 流（遵循规范）
        const response = await fetch("/chat/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            signal: abortController.signal, // 添加中止信号
            body: JSON.stringify({
                conversationID: conversationId,
                messageUserID: messageUserId,
                messageAssistantID: messageAssistantId,
                prompt: "",
                model: "",
                base64: undefined,
                reasoning: false,
            }),
        });

        if (!response.body) {
            throw new Error("响应中没有body");
        }

        // 处理 SSE 流
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedContent = "";
        let accumulatedReasoningContent = "";
        let lastReasoningTime = 0;

        try {
            while (true) {
                // 检查是否被中止
                if (abortController.signal.aborted) {
                    console.log("生成被中止");
                    break;
                }

                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                // 处理每个数据块
                processStreamChunk(chunk, (content, reasoningContent) => {
                    accumulatedContent += content;
                    accumulatedReasoningContent += reasoningContent;

                    // 解析推理时间
                    const lines = chunk.split("\n");
                    for (const line of lines) {
                        if (line.startsWith("data:")) {
                            try {
                                const data = JSON.parse(line.slice(5));
                                if (
                                    data.success &&
                                    data.reasoningTime !== undefined
                                ) {
                                    lastReasoningTime = data.reasoningTime;
                                }
                            } catch (e) {
                                // 解析失败，忽略错误
                            }
                        }
                    }

                    // 更新助手消息，标记为流式传输
                    chatStore.updateMessage(messageAssistantId, {
                        content: accumulatedContent,
                        reasoningContent: accumulatedReasoningContent,
                        reasoningTime: lastReasoningTime,
                        isStreaming: true,
                    });
                });
            }
        } catch (error) {
            if (abortController.signal.aborted) {
                console.log("生成被中止");
            } else {
                console.error("读取流时出错:", error);
            }
        } finally {
            reader.releaseLock();
            // 流结束后更新消息状态
            chatStore.updateMessage(messageAssistantId, {
                isStreaming: false,
            });
            // 设置全局生成状态为false，使停止按钮变回发送按钮
            chatStore.setIsGenerating(false);
        }
    } catch (error) {
        if (abortController?.signal?.aborted) {
            console.log("生成被中止");
        } else {
            console.error("流式生成失败:", error);
        }
    } finally {
        // 清理abort控制器
        abortControllers.delete(conversationId);
    }
};

// 停止生成函数
const stopStreamedGenerate = async (conversationId: number) => {
    const abortController = abortControllers.get(conversationId);
    if (abortController) {
        abortController.abort();
        console.log("已中止生成");
    }
    const sleep = (ms: number) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    for (let i = 0; i < 3; i++) {
        sleep(200);
        // 中断后获取最新的历史记录
        try {
            const response = await getMessagesList({
                conversationID: conversationId,
            });
            if (response.data.success) {
                // API 返回的消息格式为 JSON 字符串，需要解析
                let parsedMessages = [];
                try {
                    parsedMessages = JSON.parse(response.data.messages);
                    if (
                        parsedMessages[parsedMessages.length - 1].role !=
                        "assistant"
                    ) {
                        sleep(300);
                        continue;
                    }
                } catch (parseError) {
                    console.error("解析消息失败:", parseError);
                    parsedMessages = [];
                }

                // 转换消息格式以匹配前端要求并保存到 store
                const formattedMessages = parsedMessages.map((msg: any) => {
                    // 提取推理内容
                    let reasoningContent = msg.reasoning_content || "";
                    let reasoningTime = 0;

                    // 如果没有独立的推理内容字段，尝试从内容中提取
                    if (!reasoningContent && msg.content) {
                        // 提取内容中的推理部分
                        const thinkMatches = msg.content.matchAll(
                            /<think time=(\d+)>([\s\S]*?)<\/think>/g,
                        );
                        const contents = [];
                        for (const match of thinkMatches) {
                            contents.push(match[2]);
                            reasoningTime = Math.max(
                                reasoningTime,
                                parseInt(match[1]) || 0,
                            );
                        }
                        reasoningContent = contents.join("\n\n");
                    }

                    // 删除标签
                    const cleanContent = msg.content
                        ? msg.content
                              .replace(/<think time=\d+>[\s\S]*?<\/think>/g, "")
                              .trim()
                        : "";

                    return {
                        id: msg.id,
                        conversationID: msg.conversation_id,
                        role: msg.role,
                        content: cleanContent,
                        base64: msg.base64,
                        reasoningContent: reasoningContent,
                        reasoningTime: reasoningTime,
                        createdAt: msg.created_at,
                        isStreaming: false,
                    };
                });

                // 保存消息到 store
                chatStore.setMessages(conversationId, formattedMessages);
                break;
            }
        } catch (error) {
            console.error("获取最新历史记录失败:", error);
        }
    }
};

// 监听停止生成事件
const handleStopStreamedGenerate = (event: Event) => {
    const customEvent = event as CustomEvent;
    const { conversationId } = customEvent.detail;
    if (conversationId) {
        stopStreamedGenerate(conversationId);
    }
};

window.addEventListener("stopStreamedGenerate", handleStopStreamedGenerate);

// 在组件卸载时移除事件监听器
onUnmounted(() => {
    window.removeEventListener(
        "stopStreamedGenerate",
        handleStopStreamedGenerate,
    );
});

// 处理流数据块
const processStreamChunk = (
    chunk: string,
    onUpdate: (content: string, reasoningContent: string) => void,
) => {
    // 解析SSE数据块
    const lines = chunk.split("\n");
    for (const line of lines) {
        if (line.startsWith("data:")) {
            try {
                const data = JSON.parse(line.slice(5));
                if (data.success) {
                    onUpdate(data.content || "", data.reasoningContent || "");
                } else {
                    console.error("服务器返回错误:", data.error);
                }
            } catch (e) {
                console.error("解析数据失败:", e);
            }
        }
    }
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

/**
 * 挂载后检测 URL 参数
 */
onMounted(async () => {
    // 首先获取模型列表
    try {
        const modelsResponse = await getModelsList();
        if (modelsResponse.data.models) {
            models.value = modelsResponse.data.models;
        }
    } catch (error) {
        console.error("获取模型列表失败:", error);
    }

    // 检测当前路径是否为 /c/xxx
    const cPattern = /^\/c\/.+$/;
    if (cPattern.test(route.path)) {
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

        // 获取对话 ID (从路径的第二部分)
        const pathParts = route.path.split("/");
        const conversationIdString =
            pathParts.length > 2 ? pathParts[2] : undefined;
        const conversationId = conversationIdString
            ? parseInt(conversationIdString)
            : NaN;

        // 类型断言确保 conversationId 是有效的数字
        if (!isNaN(conversationId)) {
            isLoading.value = true;

            try {
                // 首先获取对话历史
                const response = await getMessagesList({
                    conversationID: conversationId,
                });
                if (response.data.success) {
                    // API 返回的消息格式为 JSON 字符串，需要解析
                    let parsedMessages = [];
                    try {
                        parsedMessages = JSON.parse(response.data.messages);
                    } catch (parseError) {
                        console.error("解析消息失败:", parseError);
                        parsedMessages = [];
                    }

                    // 转换消息格式以匹配前端要求并保存到 store
                    const formattedMessages = parsedMessages.map((msg: any) => {
                        // 提取推理内容
                        let reasoningContent = msg.reasoning_content || "";
                        let reasoningTime = 0;

                        // 如果没有独立的推理内容字段，尝试从内容中提取
                        if (!reasoningContent && msg.content) {
                            // 提取内容中的推理部分
                            const thinkMatches = msg.content.matchAll(
                                /<think time=(\d+)>([\s\S]*?)<\/think>/g,
                            );
                            const contents = [];
                            for (const match of thinkMatches) {
                                contents.push(match[2]);
                                reasoningTime = Math.max(
                                    reasoningTime,
                                    parseInt(match[1]) || 0,
                                );
                            }
                            reasoningContent = contents.join("\n\n");
                        }

                        // 删除标签
                        const cleanContent = msg.content
                            ? msg.content
                                  .replace(
                                      /<think time=\d+>[\s\S]*?<\/think>/g,
                                      "",
                                  )
                                  .trim()
                            : "";

                        return {
                            id: msg.id,
                            conversationID: msg.conversation_id,
                            role: msg.role,
                            content: cleanContent,
                            base64: msg.base64,
                            reasoningContent: reasoningContent,
                            reasoningTime: reasoningTime,
                            createdAt: msg.created_at,
                            isStreaming: false,
                        };
                    });

                    // 保存消息到 store
                    chatStore.setMessages(conversationId, formattedMessages);

                    // 立即隐藏加载动画并滚动到消息底部
                    isLoading.value = false;
                    await nextTick();
                    scrollToBottom();

                    // 检查是否存在未完成的对话（只有在没有type参数或者type不等于2时才检查）
                    if (typeValue === undefined || typeValue !== 2) {
                        try {
                            // 获取线程列表
                            const threadListResponse = await getThreadList();
                            if (threadListResponse.data.success) {
                                // 检查返回值中是否有当前对话id
                                const conversationKey =
                                    conversationId.toString();
                                if (
                                    threadListResponse.data.thread_list &&
                                    threadListResponse.data.thread_list[
                                        conversationKey
                                    ]
                                ) {
                                    // 获取user和ai的消息id
                                    const threadInfo =
                                        threadListResponse.data.thread_list[
                                            conversationKey
                                        ];
                                    const messageUserID =
                                        threadInfo.messageUserID;
                                    const messageAssistantID =
                                        threadInfo.messageAssistantID;

                                    // 设置全局生成状态为true，使发送按钮变为停止按钮
                                    chatStore.setIsGenerating(true);

                                    // 调用/chat/generate接口并处理流式响应
                                    await handleStreamedGenerate(
                                        conversationId,
                                        messageUserID,
                                        messageAssistantID,
                                    );
                                } else {
                                    // 如果没有未完成的对话，确保isGenerating状态为false
                                    chatStore.setIsGenerating(false);
                                }
                            }
                        } catch (error) {
                            console.error(
                                "Error calling thread_list or generate API:",
                                error,
                            );
                            // 出错时确保isGenerating状态为false
                            chatStore.setIsGenerating(false);
                        }
                    } else if (typeValue === 2) {
                        // 当type=2时，设置全局isGenerating状态，使发送按钮变为停止按钮
                        // 因为在InputArea中已经添加了待生成的消息，但跳过了自动执行生成过程
                        chatStore.setIsGenerating(true);
                    }
                }
            } catch (error) {
                console.error("Failed to get conversation history:", error);
                // Hide loading animation even if loading history fails
                isLoading.value = false;
            }
        }
    }
});

// 从消息内容中提取模型名称
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
</style>
