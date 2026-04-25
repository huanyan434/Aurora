<template>
    <div class="sidebar-header-container">
        <!-- Logo 和切换侧边栏按钮 -->
        <div class="logo-section" v-if="!isCollapsed">
            <span class="logo-text">Aurora</span>
            <Button
                variant="ghost"
                size="icon"
                class="toggle-sidebar-btn"
                @click="toggleGlobalSidebar"
            >
                <PanelLeftClose class="toggle-sidebar-icon" />
            </Button>
        </div>
        <div class="top-actions" v-else>
            <Button variant="ghost" class="toggle-sidebar-btn" @click="toggleGlobalSidebar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </Button>
        </div>

        <!-- 核心功能区 -->
        <div v-if="!isCollapsed" class="actions-section">
            <!-- 新建对话按钮 -->
            <Button
                variant="ghost"
                class="action-btn action-btn-new-conversation"
                @click="handleNewConversation"
            >
                <MessageCirclePlus class="action-icon" />
                <span>新建对话</span>
            </Button>

            <!-- 搜索按钮/输入框 -->
            <div v-if="isSearchActive" class="search-container" ref="searchContainerRef">
                <Search class="search-icon" />
                <Input
                    ref="searchInputRef"
                    v-model="searchQuery"
                    placeholder="搜索对话"
                    class="search-input"
                    @keydown.esc="closeSearch"
                />
                <button class="search-close-btn" @click="closeSearch">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <Button v-else variant="ghost" class="action-btn" @click="openSearch">
                <Search class="action-icon" />
                <span>搜索对话</span>
            </Button>

            <!-- 社区按钮 -->
            <Button variant="ghost" class="action-btn" @click="handleCommunity">
                <Compass class="action-icon" />
                <span>社区</span>
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Compass, MessageCirclePlus, PanelLeftClose, Search } from 'lucide-vue-next';
import { useSidebarStore } from '@/stores/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
    isMobileToggleVisible?: boolean;
    toggleSidebar?: () => void;
    isCollapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    isMobileToggleVisible: false,
    toggleSidebar: () => {
        const store = useSidebarStore();
        store.toggleSidebar();
        return;
    },
    isCollapsed: false,
});

const router = useRouter();
const searchQuery = ref('');
const isSearchActive = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchContainerRef = ref<HTMLDivElement | null>(null);

// emit 事件
const emit = defineEmits<{
    search: [query: string];
}>();

// 监听搜索词变化，实时触发搜索
watch(searchQuery, (newQuery) => {
    emit('search', newQuery);
});

// 点击外部关闭搜索
const handleClickOutside = (event: MouseEvent) => {
    if (isSearchActive.value && searchContainerRef.value) {
        const targetNode = event.target as Node;
        const targetHTMLElement = event.target as HTMLElement;

        // 检查点击的元素是否是对话 item 或其子元素
        const isConversationItem = targetHTMLElement.closest('.conversation-item');

        // 如果点击的是对话 item，不关闭搜索框
        if (isConversationItem) {
            return;
        }
        if (!searchContainerRef.value.contains(targetNode)) {
            closeSearch();
        }
    }
};

onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside);
});

// 使用传入的函数或默认行为
const toggleGlobalSidebar = () => {
    if (typeof props.toggleSidebar === 'function') {
        props.toggleSidebar();
    } else {
        const store = useSidebarStore();
        store.toggleSidebar();
    }
};

const handleNewConversation = async () => {
    await router.push('/');
    window.dispatchEvent(new CustomEvent('focus-input-area'));

    const sidebarStore = useSidebarStore();
    if (window.innerWidth < 1135) {
        sidebarStore.setSidebarCollapsed(true);
    }
};

// 打开搜索
const openSearch = async () => {
    isSearchActive.value = true;
    await nextTick();
    if (searchInputRef.value) {
        const inputElement = (searchInputRef.value as any).$el as HTMLInputElement;
        if (inputElement) {
            inputElement.focus();
        }
    }
};

// 关闭搜索
const closeSearch = () => {
    isSearchActive.value = false;
    searchQuery.value = '';
    emit('search', '');
};

const handleCommunity = () => {
    console.log('打开社区');
};

defineExpose({
    closeSearch
});
</script>

<style scoped>
.sidebar-header-container {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    gap: 0.5rem;
}

.logo-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0.75rem 0.5rem 0.75rem;
    margin-bottom: 0.25rem;
}

.logo-text {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1F2937;
}

.dark .logo-text {
    color: #F3F4F6;
}

.top-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
}

.toggle-sidebar-btn {
    width: 2rem;
    height: 2rem;
    padding: 0.25rem;
    color: #6B7280;
}

.toggle-sidebar-btn:hover {
    background-color: #E5E7EB;
}

.dark .toggle-sidebar-btn {
    color: #9CA3AF;
}

.dark .toggle-sidebar-btn:hover {
    background-color: #374151;
}

.toggle-sidebar-icon {
    width: 1.5rem;
    height: 1.5rem;
}

.actions-section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.action-btn {
    width: 100%;
    justify-content: flex-start;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    height: 2.5rem;
    color: #4B5563;
    user-select: none;
}

.action-btn-new-conversation {
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
}

.action-btn:hover {
    background-color: #F3F4F6;
}

.dark .action-btn {
    color: #D1D5DB;
}

.dark .action-btn:hover {
    background-color: #374151;
}

.action-icon {
    width: 1.25rem;
    height: 1.25rem;
    margin-right: 0.5rem;
}

.search-container {
    position: relative;
    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    width: 1rem;
    height: 1rem;
    color: #9CA3AF;
    pointer-events: none;
}

.dark .search-icon {
    color: #6B7280;
}

.search-input {
    width: 100%;
    padding-left: 2.25rem;
    padding-right: 2.25rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    height: 2.5rem;
    background-color: #FFFFFF;
    border: 1px solid #E5E7EB;
    font-size: 0.875rem;
}

.search-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.dark .search-input {
    background-color: #1F2937;
    border-color: #374151;
    color: #F3F4F6;
}

.dark .search-input:focus {
    border-color: #60A5FA;
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.1);
}

.search-input::placeholder {
    color: #9CA3AF;
}

.dark .search-input::placeholder {
    color: #6B7280;
}

.search-close-btn {
    position: absolute;
    right: 0.5rem;
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    color: #9CA3AF;
    border-radius: 0.25rem;
    transition: background-color 0.2s, color 0.2s;
}

.search-close-btn:hover {
    background-color: #E5E7EB;
    color: #6B7280;
}

.dark .search-close-btn {
    color: #6B7280;
}

.dark .search-close-btn:hover {
    background-color: #4B5563;
    color: #D1D5DB;
}

.search-close-btn svg {
    width: 1rem;
    height: 1rem;
}
</style>
