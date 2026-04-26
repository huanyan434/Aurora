<template>
  <section id="advantages" class="section-padding bg-[var(--color-bg-secondary)]">
    <div class="container-wide">
      <!-- 标题 -->
      <div class="section-header text-center">
        <h2 class="section-title text-3xl md:text-4xl font-bold">为高质量交付而设计</h2>
      </div>

      <!-- 优势网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div
          v-for="advantage in advantages"
          :key="advantage.title"
          class="flex gap-5 card-padding rounded-[var(--radius-card)] bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] shadow-sm"
        >
          <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#06B6D4] flex items-center justify-center">
            <span class="text-white font-bold text-sm">{{ advantage.number }}</span>
          </div>
          <div>
            <h3 class="text-lg font-semibold mb-2">{{ advantage.title }}</h3>
            <p class="text-[var(--color-text-secondary)] text-sm leading-relaxed">{{ advantage.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const advantages = [
  {
    number: '01',
    title: '更自然的交互',
    description: '像对话一样表达需求，也能处理复杂、多步骤任务。'
  },
  {
    number: '02',
    title: '多种模型',
    description: '支持多种AI模型选择，根据任务特点选择最适合的模型。'
  },
  {
    number: '03',
    title: '更强的扩展能力',
    description: '支持自定义参数与团队级使用场景。'
  },
  {
    number: '04',
    title: '更值得信赖',
    description: '强调隐私、安全、可控、专业。'
  }
]
</script>
