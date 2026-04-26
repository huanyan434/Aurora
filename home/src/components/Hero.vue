<template>
  <section class="hero-shell">
    <!-- 背景效果 -->
    <div class="hero-background">
      <div class="hero-glow hero-glow-primary"></div>
      <div class="hero-glow hero-glow-secondary"></div>
    </div>

    <!-- 内容 -->
    <div class="hero-inner container-wide">
      <div class="hero-content">
        <!-- Badge -->
        <div class="hero-badge animate-fade-in">
          <span class="hero-badge-dot"></span>
          <span class="hero-badge-text">Aurora AI Platform</span>
        </div>

        <!-- 主标题 -->
        <h1 class="hero-title animate-fade-in-up">
          与更聪明的 AI <span class="hero-title-gradient">一起工作</span>
        </h1>

        <!-- 副标题 -->
        <p class="hero-description animate-fade-in-up-delay">
          Aurora 是面向个人与团队的智能平台，帮助你完成搜索、写作、分析与创作。
        </p>

        <!-- CTA 按钮 -->
        <div class="hero-actions animate-fade-in-up-delay-2">
          <a
            href="https://c.wanyim.cn"
            target="_blank"
            class="btn-primary"
          >
            立即开始
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
</script>

<style scoped>
.hero-shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 4rem 1rem 6rem;
}

.hero-background {
  position: absolute;
  inset: 0;
  background: var(--color-bg-primary);
}

.hero-glow {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
}

.hero-glow-primary {
  top: 50%;
  left: 50%;
  width: 50rem;
  height: 50rem;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.05), transparent);
  filter: blur(120px);
}

.hero-glow-secondary {
  top: 25%;
  right: 25%;
  width: 25rem;
  height: 25rem;
  background: rgba(139, 92, 246, 0.08);
}

.hero-inner {
  position: relative;
  z-index: 10;
  max-width: 60rem;
}

.hero-content {
  max-width: 60rem;
  margin: 0 auto;
  text-align: center;
  padding: 8rem 0;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  margin-bottom: 1.5rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-secondary);
}

.hero-badge-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: #06B6D4;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.hero-badge-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.hero-title {
  margin: 0 0 1rem;
  font-size: clamp(3rem, 6vw, 4rem);
  font-weight: 700;
  line-height: 1.1;
}

.hero-title-gradient {
  background: linear-gradient(90deg, #6366F1, #06B6D4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-description {
  margin: 0 0 2rem;
  font-size: 1.125rem;
  line-height: 1.75;
  color: var(--color-text-secondary);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

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
