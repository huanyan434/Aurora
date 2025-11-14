import { defineStore } from 'pinia';

export const useSidebarStore = defineStore('sidebar', {
  state: () => ({
    collapsed: true,  // 初始状态为折叠
  }),
  
  actions: {
    toggleSidebar() {
      this.collapsed = !this.collapsed;
    },
    
    setSidebarCollapsed(collapsed: boolean) {
      this.collapsed = collapsed;
    },
  },
  
  // 启用持久化
  persist: {
    key: 'sidebar-store',
    storage: localStorage,
  },
});