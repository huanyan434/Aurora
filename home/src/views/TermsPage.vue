<template>
  <div class="page-shell">
    <Header />
    <main class="page-main">
      <section class="placeholder-card">
        <p class="placeholder-label">服务条款</p>
        <h1 class="placeholder-title">暂未完成</h1>
        <p class="placeholder-text">这里后续会补充使用规则、责任说明与条款细则。</p>
      </section>
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
</script>

<style scoped>
.page-shell {
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.page-main {
  padding: 6rem 1rem 7rem;
}

.placeholder-card {
  max-width: 40rem;
  margin: 0 auto;
  padding: 3rem 2rem;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  background: var(--color-bg-card);
  text-align: center;
}

.placeholder-label {
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.placeholder-title {
  margin-bottom: 1rem;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.placeholder-text {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--color-text-secondary);
}
</style>
