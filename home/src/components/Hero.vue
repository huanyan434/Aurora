<template>
  <section class="relative min-h-screen flex items-center justify-center overflow-hidden">
    <!-- 背景效果 -->
    <div class="absolute inset-0 bg-[var(--color-bg-primary)]">
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-[#6366F1]/10 via-[#06B6D4]/5 to-transparent rounded-full blur-[120px] animate-pulse-slow"></div>
      <div class="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#8B5CF6]/8 rounded-full blur-[80px]"></div>
    </div>

    <!-- 内容 -->
    <div class="relative z-10 container-wide text-center hero-content max-w-[960px]">
      <!-- Badge -->
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] mb-8 animate-fade-in">
        <span class="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse"></span>
        <span class="text-sm text-[var(--color-text-secondary)]">Aurora AI Platform</span>
      </div>

      <!-- 主标题 -->
      <h1 class="text-5xl md:text-6xl lg:text-[64px] font-bold leading-tight mb-6 animate-fade-in-up">
        与更聪明的 AI <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] to-[#06B6D4]">一起工作</span>
      </h1>

      <!-- 副标题 -->
      <p class="text-lg md:text-xl text-[var(--color-text-secondary)] mb-10 animate-fade-in-up-delay">
        Aurora 是面向个人与团队的智能平台，帮助你完成搜索、写作、分析与创作。
      </p>

      <!-- CTA 按钮 -->
      <div class="flex flex-wrap items-center justify-center gap-4 mt-10 animate-fade-in-up-delay-2">
        <a 
          href="https://c.wanyim.cn" 
          target="_blank"
          class="btn-primary"
        >
          立即开始
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
</script>

<style scoped>
.animate-pulse-slow {
  animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fadeIn 0.6s ease-out;
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}

.animate-fade-in-up-delay {
  animation: fadeInUp 0.6s ease-out 0.1s both;
}

.animate-fade-in-up-delay-2 {
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.animate-fade-in-up-delay-3 {
  animation: fadeInUp 0.6s ease-out 0.3s both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
