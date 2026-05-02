<template>
  <div class="loading-logo-wrap">
    <img :src="loadingLogo" class="loading-logo" />
  </div>
</template>

<script setup lang="ts">
const loadingLogo = '/icon.svg'
</script>

<style scoped>
.loading-logo-wrap {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-logo {
  width: 36px;
  height: 36px;
  display: block;
  transform-origin: center;
  animation: loading-logo-rotate 2s cubic-bezier(0.42, 0, 0.58, 1) infinite;
  will-change: transform;
}

@keyframes loading-logo-rotate {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(0.72);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}
</style>
