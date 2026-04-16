<template>
  <footer class="py-16 border-t border-[var(--color-border-subtle)]">
    <div class="container-wide">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <!-- 品牌信息 -->
        <div class="md:col-span-1">
          <div class="flex items-center gap-2 mb-4">
            <img src="@/assets/icon.png" alt="Aurora" class="w-8 h-8" />
            <span class="text-lg font-semibold">Aurora</span>
          </div>
          <p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Aurora is an intelligent platform for work, creation, and automation.
          </p>
        </div>

        <!-- 产品链接 -->
        <div>
          <h4 class="font-semibold mb-4">产品</h4>
          <ul class="space-y-3">
            <li><a href="#features" class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">能力</a></li>
            <li><a href="#scenes" class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">场景</a></li>
            <li><a href="https://c.wanyim.cn" target="_blank" class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">开始聊天</a></li>
          </ul>
        </div>

        <!-- 支持链接 -->
        <div>
          <h4 class="font-semibold mb-4">支持</h4>
          <ul class="space-y-3">
            <li><a href="/privacy" class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">隐私政策</a></li>
            <li><a href="/terms" class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">服务条款</a></li>
          </ul>
        </div>

        <!-- 社交链接 -->
        <div>
          <h4 class="font-semibold mb-4">联系我们</h4>
          <ul class="space-y-3">
            <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">GitHub</a></li>
            <li><a href="https://qm.qq.com/" target="_blank" rel="noopener noreferrer" class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200">QQ 群</a></li>
          </ul>
        </div>
      </div>

      <!-- 版权信息 -->
      <div class="pt-8 border-t border-[var(--color-border-subtle)]">
        <p class="text-sm text-[var(--color-text-muted)] text-center">
          © {{ currentYear }} Aurora. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>
