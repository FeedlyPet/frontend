import {createRouter, createWebHistory} from 'vue-router'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            redirect: '/onboarding',
        },
        {
            path: '/onboarding',
            component: () => import('@/features/profile/pages/OnboardingPage.vue'),
            meta: {guest: true},
        },
        {
            path: '/login',
            component: () => import('@/features/auth/pages/LoginPage.vue'),
            meta: {guest: true},
        },
        {
            path: '/register',
            component: () => import('@/features/auth/pages/RegisterPage.vue'),
            meta: {guest: true},
        },
        {
            path: '/forgot-password',
            component: () => import('@/features/auth/pages/ForgotPasswordPage.vue'),
            meta: {guest: true},
        },
        {
            path: '/reset-password',
            component: () => import('@/features/auth/pages/ResetPasswordPage.vue'),
            meta: {guest: true},
        },
        {
            path: '/verify-email',
            component: () => import('@/features/auth/pages/VerifyEmailPage.vue'),
            meta: {guest: true},
        },
        {
            path: '/',
            component: () => import('@/shared/layouts/AppLayout.vue'),
            meta: {auth: true},
            children: [
                {
                    path: 'dashboard',
                    component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
                },
                {
                    path: 'pets',
                    component: () => import('@/features/pets/pages/PetsPage.vue'),
                },
                {
                    path: 'devices',
                    component: () => import('@/features/devices/pages/DevicesPage.vue'),
                },
                {
                    path: 'devices/:id',
                    component: () => import('@/features/devices/pages/DeviceDetailPage.vue'),
                },
                {
                    path: 'devices/:deviceId/schedules',
                    component: () => import('@/features/schedules/pages/SchedulesPage.vue'),
                },
                {
                    path: 'devices/:deviceId/events',
                    component: () => import('@/features/events/pages/EventsPage.vue'),
                },
                {
                    path: 'devices/:deviceId/statistics',
                    component: () => import('@/features/statistics/pages/StatisticsPage.vue'),
                },
                {
                    path: 'notifications',
                    component: () => import('@/features/notifications/pages/NotificationsPage.vue'),
                },
                {
                    path: 'notifications/settings',
                    component: () => import('@/features/notifications/pages/NotificationSettingsPage.vue'),
                },
                {
                    path: 'profile',
                    component: () => import('@/features/profile/pages/ProfilePage.vue'),
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
