import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/onboarding',
    },
    {
      path: '/onboarding',
      component: () => import('../pages/OnboardingPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      component: () => import('../pages/RegisterPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/forgot-password',
      component: () => import('../pages/ForgotPasswordPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/reset-password',
      component: () => import('../pages/ResetPasswordPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/verify-email',
      component: () => import('../pages/VerifyEmailPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      meta: { auth: true },
      children: [
        {
          path: 'dashboard',
          component: () => import('../pages/DashboardPage.vue'),
        },
        {
          path: 'pets',
          component: () => import('../pages/PetsPage.vue'),
        },
        {
          path: 'devices',
          component: () => import('../pages/DevicesPage.vue'),
        },
        {
          path: 'devices/:id',
          component: () => import('../pages/DeviceDetailPage.vue'),
        },
        {
          path: 'devices/:deviceId/schedules',
          component: () => import('../pages/SchedulesPage.vue'),
        },
        {
          path: 'devices/:deviceId/events',
          component: () => import('../pages/EventsPage.vue'),
        },
        {
          path: 'devices/:deviceId/statistics',
          component: () => import('../pages/StatisticsPage.vue'),
        },
        {
          path: 'notifications',
          component: () => import('../pages/NotificationsPage.vue'),
        },
        {
          path: 'notifications/settings',
          component: () => import('../pages/NotificationSettingsPage.vue'),
        },
        {
          path: 'profile',
          component: () => import('../pages/ProfilePage.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('accessToken')

  if (to.meta.auth && !token) {
    return '/login'
  }

  if (to.meta.guest && token) {
    return '/dashboard'
  }
})

export default router
