<template>
  <section class="py-24 md:py-32">
    <div class="max-w-[900px] mx-auto px-6 lg:px-8">
      <div class="relative p-12 md:p-16 rounded-[var(--radius-card)] bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] overflow-hidden text-center">
        <!-- 背景光效 -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#7B8CFF]/15 via-[#5CE1E6]/10 to-transparent rounded-full blur-[100px]"></div>

        <!-- 内容 -->
        <div class="relative z-10">
          <h2 class="text-3xl md:text-4xl font-bold mb-4">现在开始使用 Aurora</h2>
          <p class="text-lg text-[var(--color-text-secondary)] mb-8">
            更自然的交互，更高效的工作方式，更可靠的 AI 结果。
          </p>
          <div class="flex flex-wrap items-center justify-center gap-4">
            <a 
              href="https://c.wanyim.cn" 
              target="_blank"
              class="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#7B8CFF] to-[#5CE1E6] text-white font-medium hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
            >
              免费体验
            </a>
            <a 
              href="https://c.wanyim.cn" 
              target="_blank"
              class="px-8 py-3.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[var(--color-text-primary)] font-medium hover:bg-white/[0.08] transition-all duration-200"
            >
              联系我们
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
