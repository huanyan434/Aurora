import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './views/HomePage.vue'
import PrivacyPage from './views/PrivacyPage.vue'
import TermsPage from './views/TermsPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: PrivacyPage,
    },
    {
      path: '/terms',
      name: 'terms',
      component: TermsPage,
    },
  ],
})

export default router
