<template>
  <section id="scenes" class="section-padding">
    <div class="container-wide">
      <!-- 标题 -->
      <div class="section-header text-center">
        <h2 class="section-title text-3xl md:text-4xl font-bold">适用于真实工作场景</h2>
      </div>

      <!-- 场景网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="scene in scenes"
          :key="scene.title"
          class="group card-padding rounded-[var(--radius-card)] bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
        >
          <h3 class="text-lg font-semibold mb-3">{{ scene.title }}</h3>
          <p class="text-[var(--color-text-secondary)] text-sm">{{ scene.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const scenes = [
  {
    title: '学习与研究',
    description: '总结资料、解释概念、整理知识结构，加速学习过程。'
  },
  {
    title: '日常办公',
    description: '会议纪要、邮件草稿、日报周报、项目推进，提升办公效率。'
  },
  {
    title: '内容创作',
    description: '写文章、写方案、生成标题、润色表达，激发创作灵感。'
  },
  {
    title: '商业分析',
    description: '竞品调研、数据归纳、行业信息整理，支持商业决策。'
  }
]
</script>
