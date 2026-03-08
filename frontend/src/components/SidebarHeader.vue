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
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" d="M21 5H11v14h10zM3 5h6v14H3zm0-2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm2 4.25a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5zm-.75 3.5A.75.75 0 0 1 5 10h2a.75.75 0 0 1 0 1.5H5a.75.75 0 0 1-.75-.75m.75 2a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5z"/>
                </svg>
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
            <Button variant="ghost" class="action-btn" @click="handleNewConversation">
                <svg xmlns="http://www.w3.org/2000/svg" class="action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                <span>新建对话</span>
            </Button>

            <!-- 搜索按钮/输入框 -->
            <div v-if="isSearchActive" class="search-container" ref="searchContainerRef">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <Input
                    ref="searchInputRef"
                    v-model="searchQuery"
                    placeholder="搜索对话"
                    class="search-input"
                    @keyup.enter="handleSearch"
                    @keydown.esc="closeSearch"
                />
                <button class="search-close-btn" @click="closeSearch">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <Button v-else variant="ghost" class="action-btn" @click="openSearch">
                <svg xmlns="http://www.w3.org/2000/svg" class="action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <span>搜索对话</span>
            </Button>

            <!-- 社区按钮 -->
            <Button variant="ghost" class="action-btn" @click="handleCommunity">
                <svg xmlns="http://www.w3.org/2000/svg" class="action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                <span>社区</span>
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
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

// 点击外部关闭搜索
const handleClickOutside = (event: MouseEvent) => {
    if (isSearchActive.value && searchContainerRef.value) {
        const target = event.target as Node;
        if (!searchContainerRef.value.contains(target)) {
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

const handleNewConversation = () => {
    router.push('/');
};

// 打开搜索
const openSearch = async () => {
    isSearchActive.value = true;
    await nextTick();
    if (searchInputRef.value) {
        searchInputRef.value.focus();
    }
};

// 关闭搜索
const closeSearch = () => {
    isSearchActive.value = false;
    searchQuery.value = '';
};

const handleSearch = () => {
    console.log('搜索对话:', searchQuery.value);
    // TODO: 实现搜索功能
};

const handleCommunity = () => {
    console.log('打开社区');
    // TODO: 实现社区功能
};
</script>

<style scoped>
.sidebar-header-container {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    gap: 0.5rem;
}

/* Logo 区域 */
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

/* 顶部操作区 */
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

.logo-section .toggle-sidebar-btn {
    width: 2rem;
    height: 2rem;
    padding: 0.25rem;
}

.logo-section .toggle-sidebar-btn svg {
    width: 1.5rem;
    height: 1.5rem;
}

/* 核心功能区 */
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

/* 搜索框容器 */
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
    border-color: #6D28D9;
    box-shadow: 0 0 0 2px rgba(109, 40, 189, 0.1);
}

.dark .search-input {
    background-color: #1F2937;
    border-color: #374151;
    color: #F3F4F6;
}

.dark .search-input:focus {
    border-color: #A78BFA;
    box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.1);
}

.search-input::placeholder {
    color: #9CA3AF;
}

.dark .search-input::placeholder {
    color: #6B7280;
}

/* 搜索关闭按钮 */
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
