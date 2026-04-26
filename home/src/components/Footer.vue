<template>
  <footer class="footer-shell">
    <div class="container-wide">
      <div class="footer-grid">
        <!-- 品牌信息 -->
        <div class="footer-brand-column">
          <div class="footer-brand">
            <img src="@/assets/icon.svg" alt="Aurora" class="footer-logo" />
            <span class="footer-brand-name">Aurora</span>
          </div>
          <p class="footer-description">
            Aurora is an intelligent platform for work, creation, and automation.
          </p>
        </div>

        <!-- 支持链接 -->
        <div>
          <h4 class="footer-heading">支持</h4>
          <ul class="footer-list">
            <li><RouterLink to="/privacy" class="footer-link">隐私政策</RouterLink></li>
            <li><RouterLink to="/terms" class="footer-link">服务条款</RouterLink></li>
          </ul>
        </div>

        <!-- 社交链接 -->
        <div>
          <h4 class="footer-heading">联系我们</h4>
          <ul class="footer-list">
            <li><a href="https://github.com/huanyan434/" target="_blank" rel="noopener noreferrer" class="footer-link">GitHub</a></li>
            <li><a href="https://qm.qq.com/q/80anNmSdUc" target="_blank" rel="noopener noreferrer" class="footer-link">QQ 群</a></li>
          </ul>
        </div>
      </div>

      <!-- 版权信息 -->
      <div class="footer-copyright">
        <p class="footer-copyright-text">
          © {{ currentYear }} Aurora. All rights reserved.
        </p>
        <a class="icp" href="http://beian.miit.gov.cn" target="_blank" rel="noreferrer noopener">苏ICP备2025161166号-2</a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<style scoped>
.footer-shell {
  padding: 4rem 0;
  border-top: 1px solid var(--color-border-subtle);
}

.footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  margin-bottom: 3rem;
}

@media (min-width: 768px) {
  .footer-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 3rem;
  }

  .footer-brand-column {
    grid-column: span 1;
  }
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.footer-logo {
  width: 2rem;
  height: 2rem;
}

.footer-brand-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.footer-description {
  font-size: 0.875rem;
  line-height: 1.625;
  color: var(--color-text-secondary);
}

.footer-heading {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.footer-list {
  display: grid;
  gap: 0.75rem;
}

.footer-link {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--color-text-primary);
}

.footer-copyright {
  padding-top: 2rem;
  border-top: 1px solid var(--color-border-subtle);
  display: grid;
  gap: 0.5rem;
  justify-items: center;
}

.footer-copyright-text {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-align: center;
}

.icp {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.icp:hover {
  color: var(--color-text-primary);
}
</style>
