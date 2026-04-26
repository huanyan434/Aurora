<template>
  <section id="features" class="section-padding bg-[var(--color-bg-secondary)]">
    <div class="container-wide">
      <!-- 标题 -->
      <div class="section-header text-center">
        <h2 class="section-title text-3xl md:text-4xl font-bold">核心能力，一站完成</h2>
      </div>

      <!-- 卡片网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="group card-padding rounded-[var(--radius-card)] bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default"
        >
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6366F1]/10 to-[#06B6D4]/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
            <span class="text-2xl">{{ feature.icon }}</span>
          </div>
          <h3 class="text-xl font-semibold mb-3">{{ feature.title }}</h3>
          <p class="text-[var(--color-text-secondary)] text-sm leading-relaxed">{{ feature.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const features = [
  {
    icon: '💬',
    title: '智能问答',
    description: '快速理解复杂问题，给出结构化答案与可执行建议。'
  },
  {
    icon: '✍️',
    title: '长文写作',
    description: '支持方案、报告、邮件、总结、文章等多种内容生成与润色。'
  },
  {
    icon: '📊',
    title: '深度分析',
    description: '处理长文本、表格、数据与多轮上下文，辅助推理和决策。'
  },
  {
    icon: '🔍',
    title: '联网搜索',
    description: '整合实时信息，输出更可靠的搜索与归纳结果。'
  }
]
</script>
