import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/app',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'guia',
          name: 'guia',
          component: () => import('@/views/GuideView.vue'),
        },
        {
          path: 'cursos',
          name: 'cursos',
          component: () => import('@/views/CoursesView.vue'),
        },
        {
          path: 'knowledge',
          name: 'knowledge',
          component: () => import('@/views/KnowledgeView.vue'),
        },
        {
          path: 'flujos',
          name: 'flujos',
          component: () => import('@/views/FlowBuilderView.vue'),
        },
        {
          path: 'whatsapp',
          name: 'whatsapp',
          component: () => import('@/views/WhatsappView.vue'),
        },
        {
          path: 'conversaciones',
          name: 'conversaciones',
          component: () => import('@/views/ConversationsView.vue'),
        },
        {
          path: 'ventas',
          name: 'ventas',
          component: () => import('@/views/SalesView.vue'),
        },
        {
          path: 'ajustes',
          name: 'ajustes',
          component: () => import('@/views/SettingsView.vue'),
        },
      ],
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const store = useAppStore()
  if (to.meta.requiresAuth && !store.isAuthenticated) {
    return { name: 'login' }
  }
  if (to.meta.guest && store.isAuthenticated) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
