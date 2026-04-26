<template>
  <div class="page-shell">
    <Header />
    <main>
      <Hero />
      <Features />
      <Scenes />
      <Advantages />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Header from '../components/Header.vue'
import Hero from '../components/Hero.vue'
import Features from '../components/Features.vue'
import Scenes from '../components/Scenes.vue'
import Advantages from '../components/Advantages.vue'
import Footer from '../components/Footer.vue'
</script>

<style scoped>
.page-shell {
  min-height: 100vh;
  background: var(--color-bg-primary);
}
</style>
