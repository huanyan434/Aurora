<template>
  <header
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-white/80 backdrop-blur-md border-b border-[var(--color-border-subtle)]'
        : 'bg-transparent'
    ]"
  >
    <div class="container-wide h-[72px] flex items-center justify-between">
      <!-- Logo -->
      <RouterLink to="/" class="header-brand">
        <img src="@/assets/icon.svg" alt="Aurora" class="w-8 h-8" />
        <span class="text-lg font-semibold text-[var(--color-text-primary)]">Aurora</span>
      </RouterLink>

      <!-- 导航链接 -->
      <nav class="flex items-center gap-8" v-if="route.path === '/'">
        <a href="/#features" class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">能力</a>
        <a href="/#scenes" class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">场景</a>
        <a href="/#advantages" class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">优势</a>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute();

const scrolled = ref(false)

const handleScroll = () => {
  scrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.header-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  cursor: pointer;
}
</style>

