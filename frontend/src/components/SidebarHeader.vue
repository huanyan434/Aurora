<template>
    <div class="sidebar-header-container">
        <!-- 用户区 + 侧边栏控制 -->
        <div class="brand-user-section">
            <div class="user-menu-container">
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <Button variant="ghost" class="user-menu-btn" type="button">
                            <Avatar class="user-avatar">
                                <AvatarImage src="/avatars/user.jpg" alt="@user" />
                                <AvatarFallback>{{ userInitial || 'U' }}</AvatarFallback>
                            </Avatar>
                            <div class="user-info">
                                <span class="user-name">{{ userStore.userInfo.username || '未登录' }}</span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent class="user-dropdown-content" align="start" :sideOffset="8">
                        <DropdownMenuItem class="profile-menu-item" @click="goToProfile">
                            <UserRound class="menu-item-icon" />
                            <span>个人中心</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem class="logout-menu-item" @click="handleLogout">
                            <LogOut class="menu-item-icon" />
                            <span>退出登录</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Button
                variant="ghost"
                size="icon"
                class="toggle-sidebar-btn"
                @click="toggleGlobalSidebar"
            >
                <PanelLeftClose class="toggle-sidebar-icon" />
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
import { ref, nextTick, onMounted, onUnmounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Compass, LogOut, MessageCirclePlus, PanelLeftClose, Search, UserRound } from 'lucide-vue-next';
import { useSidebarStore } from '@/stores/sidebar';
import { useUserStore } from '@/stores/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitial } from '@/lib/utils';
import { logout } from '@/api/user';

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
const userStore = useUserStore();
const userInitial = computed(() => {
    return getInitial(userStore.userInfo.username);
});
const searchQuery = ref('');
const isSearchActive = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchContainerRef = ref<HTMLDivElement | null>(null);

const emit = defineEmits<{
    search: [query: string];
    'open-settings': [];
}>();

watch(searchQuery, (newQuery) => {
    emit('search', newQuery);
});

const goToProfile = () => {
    router.push('/profile');
};

const openSettingsDialog = () => {
    emit('open-settings');
};

const handleLogout = async () => {
    try {
        await logout();
        userStore.logout();
        router.push('/login');
    } catch (error) {
        console.error('退出登录失败:', error);
    }
};

const handleClickOutside = (event: MouseEvent) => {
    if (isSearchActive.value && searchContainerRef.value) {
        const targetNode = event.target as Node;
        const targetHTMLElement = event.target as HTMLElement;
        const isConversationItem = targetHTMLElement.closest('.conversation-item');
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

const closeSearch = () => {
    isSearchActive.value = false;
    searchQuery.value = '';
    emit('search', '');
};

const handleCommunity = () => {
    console.log('打开社区');
};

defineExpose({
    closeSearch,
});
</script>

<style scoped>
.sidebar-header-container {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    gap: 0.5rem;
}

.brand-user-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem 0.25rem 0.5rem;
}

.user-menu-container {
    flex: 1;
    min-width: 0;
}

.user-menu-btn {
    width: 100%;
    justify-content: flex-start;
    gap: 0.75rem;
    padding: 0.1rem 0.1rem;
    height: auto;
    border-radius: 0.75rem;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.user-menu-btn:hover {
    background-color: transparent;
}

.dark .user-menu-btn:hover {
    background-color: transparent;
}

.user-avatar {
    height: 2rem;
    width: 2rem;
    flex-shrink: 0;
}

.user-info {
    min-width: 0;
    flex: 1;
    text-align: left;
}

.user-name {
    display: block;
    font-size: 0.95rem;
    font-weight: 600;
    color: #1F2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dark .user-name {
    color: #F3F4F6;
}

.user-dropdown-content {
    width: 14rem;
    background-color: #0f0f0f;
    border-color: #404040;
    z-index: 2100;
}

.dark .user-dropdown-content {
    background-color: #0f0f0f;
    border-color: #404040;
    z-index: 2100;
}

.menu-item-icon {
    width: 1rem;
    height: 1rem;
    margin-right: 0.5rem;
    flex-shrink: 0;
}

.profile-menu-item,
.settings-menu-item,
.logout-menu-item {
    cursor: pointer;
    display: flex;
    align-items: center;
}

.profile-menu-item,
.settings-menu-item {
    color: #1f2937;
}

.dark .profile-menu-item,
.dark .settings-menu-item {
    color: #f5f5f5;
}

.logout-menu-item {
    color: var(--color-red-600);
}

.dark .logout-menu-item {
    color: #f87171;
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
