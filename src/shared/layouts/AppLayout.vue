<script setup lang="ts">
import {ref, onMounted, onUnmounted, computed} from 'vue'
import {RouterLink, RouterView, useRouter, useRoute} from 'vue-router'
import {authApi} from '@/features/auth/api/auth.api.ts'
import {notificationsApi} from '@/features/notifications/api/notifications.api.ts'
import AppLogo from '@/shared/components/AppLogo.vue'
import {useTheme} from '@/shared/composables/use-theme.ts'
import {useI18n} from '@/shared/composables/use-i18n.ts'
import {getCurrentUser} from '@/shared/composables/use-current-user.ts'

const router = useRouter()
const route = useRoute()

const {theme, toggle: toggleTheme} = useTheme()
const {lang, t, toggle: toggleLang} = useI18n()

const unreadCount = ref(0)
const user = ref<{ name: string; email: string } | null>(null)

const userInitials = computed(() => {
  if (!user.value?.name) return '?'
  return user.value.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
})

const pageTitle = computed(() => {
  const path = route.path
  if (path.startsWith('/dashboard')) return t.value.dashboard
  if (path.startsWith('/pets')) return t.value.pets
  if (path.startsWith('/devices')) return t.value.devices
  if (path.startsWith('/notifications')) return t.value.notifications
  if (path.startsWith('/profile')) return t.value.profile
  return 'FeedlyPet'
})

let interval: ReturnType<typeof setInterval>

onMounted(() => {
  user.value = getCurrentUser()
  fetchUnreadCount()
  interval = setInterval(fetchUnreadCount, 30_000)
})

onUnmounted(() => clearInterval(interval))

async function fetchUnreadCount() {
  try {
    unreadCount.value = await notificationsApi.getUnreadCount()
  } catch {
  }
}

async function logout() {
  const refreshToken = localStorage.getItem('refreshToken')
  if (refreshToken) {
    try {
      await authApi.logout(refreshToken)
    } catch {
    }
  }
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  router.push('/login')
}

const navItems = computed(() => [
  {
    to: '/dashboard',
    label: t.value.dashboard,
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    to: '/pets',
    label: t.value.pets,
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  },
  {
    to: '/devices',
    label: t.value.devices,
    icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18',
  },
  {
    to: '/notifications',
    label: t.value.alerts,
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    notifications: true,
  },
  {
    to: '/profile',
    label: t.value.profile,
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
])
</script>

<template>
  <div class="layout">

    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon-wrap">
          <AppLogo variant="dark" :size="28"/>
        </div>
        <span class="logo-text">Feedly<span>Pet</span></span>
      </div>

      <nav class="sidebar-nav">
        <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            active-class="nav-item--active"
        >
          <svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon"/>
          </svg>
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="item.notifications && unreadCount > 0" class="badge">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="avatar">{{ userInitials }}</div>
          <div class="user-details">
            <p class="user-name">{{ user?.name ?? 'User' }}</p>
            <p class="user-email">{{ user?.email }}</p>
          </div>
        </div>
        <button @click="logout" class="logout-btn">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          {{ t.logout }}
        </button>
      </div>
    </aside>

    <div class="main-wrap">
      <header class="header">
        <h1 class="header-title">{{ pageTitle }}</h1>
        <div class="header-right">

          <button class="ctrl-btn" @click="toggleLang"
                  :title="lang === 'en' ? 'Switch to Ukrainian' : 'Перейти на англійську'">
            <span class="lang-label">{{ lang === 'en' ? 'UA' : 'EN' }}</span>
          </button>

          <button class="ctrl-btn theme-btn" @click="toggleTheme"
                  :title="theme === 'light' ? 'Dark mode' : 'Light mode'">
            <svg v-if="theme === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 width="18" height="18">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          </button>

          <RouterLink to="/notifications" class="bell-btn">
            <svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <span v-if="unreadCount > 0" class="bell-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </RouterLink>

          <RouterLink to="/profile" class="header-avatar">{{ userInitials }}</RouterLink>
        </div>
      </header>

      <main class="content">
        <RouterView/>
      </main>
    </div>

    <nav class="bottom-nav">
      <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="bottom-nav-item"
          active-class="bottom-nav-item--active"
      >
        <div class="relative">
          <svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" width="24" height="24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon"/>
          </svg>
          <span v-if="item.notifications && unreadCount > 0" class="badge badge--sm">
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </div>
        <span class="bottom-nav-label">{{ item.label }}</span>
      </RouterLink>
    </nav>

  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  background: var(--bg-page);
  display: flex;
  transition: background 0.25s ease;
}

.sidebar {
  display: none;
  width: 256px;
  background: var(--bg-sidebar);
  flex-direction: column;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  height: 100vh;
  z-index: 20;
  transition: background 0.25s ease;
}

@media (min-width: 768px) {
  .sidebar {
    display: flex;
  }
}

.sidebar-logo {
  height: 60px;
  padding: 0 1.25rem;
  border-bottom: 1px solid var(--sidebar-border);
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 0;
}

.logo-icon-wrap {
  width: 36px;
  height: 36px;
  background: linear-gradient(145deg, #B86E30 0%, #2C1208 100%);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
}

.logo-text {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.3rem;
  color: #F5EDE0;
  letter-spacing: -0.02em;
}

.logo-text span {
  color: #C4875A;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: 0.75rem;
  color: var(--sidebar-text);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;
  position: relative;
}

.nav-item:hover {
  background: var(--sidebar-hover-bg);
  color: #F5EDE0;
}

.nav-item--active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-text-active);
  font-weight: 600;
}

.nav-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
}

.badge {
  background: #A0522D;
  color: #F5EDE0;
  font-size: 0.68rem;
  font-weight: 700;
  border-radius: 9999px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.badge--sm {
  min-width: 14px;
  height: 14px;
  font-size: 0.6rem;
  position: absolute;
  top: -4px;
  right: -4px;
}

.sidebar-footer {
  padding: 0.85rem;
  border-top: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.25rem 0.35rem;
}

.avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #A0522D;
  color: #F5EDE0;
  font-size: 0.72rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-details {
  min-width: 0;
}

.user-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #F5EDE0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 0.68rem;
  color: var(--sidebar-footer-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.7rem;
  border-radius: 0.6rem;
  background: none;
  border: none;
  color: var(--sidebar-footer-text);
  font-size: 0.82rem;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  width: 100%;
}

.logout-btn:hover {
  background: rgba(160, 82, 45, 0.2);
  color: #C4875A;
}

.main-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 0;
}

@media (min-width: 768px) {
  .main-wrap {
    margin-left: 256px;
  }
}

.header {
  background: var(--bg-header);
  border-bottom: 1px solid var(--border);
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 10;
  transition: background 0.25s ease, border-color 0.25s ease;
}

.header-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.6rem;
  border-radius: 0.6rem;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.ctrl-btn:hover {
  border-color: var(--brown-light);
  color: var(--text-primary);
  background: var(--bg-page);
}

.lang-flag {
  font-size: 0.9rem;
  line-height: 1;
}

.lang-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.theme-btn {
  padding: 0.35rem 0.5rem;
}

.bell-btn {
  position: relative;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  padding: 0.3rem;
  border-radius: 0.5rem;
  transition: color 0.2s;
}

.bell-btn:hover {
  color: var(--text-primary);
}

.bell-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #A0522D;
  color: #F5EDE0;
  font-size: 0.58rem;
  font-weight: 700;
  border-radius: 9999px;
  min-width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.header-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #A0522D;
  color: #F5EDE0;
  font-size: 0.72rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.header-avatar:hover {
  opacity: 0.85;
}

.content {
  flex: 1;
  padding: 1.5rem;
  padding-bottom: 5.5rem;
}

@media (min-width: 768px) {
  .content {
    padding: 2rem;
    padding-bottom: 2rem;
  }
}

.bottom-nav {
  display: flex;
  position: fixed;
  bottom: 0;
  inset-x: 0;
  background: var(--bg-sidebar);
  border-top: 1px solid var(--sidebar-border);
  z-index: 20;
  transition: background 0.25s ease;
}

@media (min-width: 768px) {
  .bottom-nav {
    display: none;
  }
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0;
  color: var(--sidebar-text);
  text-decoration: none;
  position: relative;
  transition: color 0.2s;
  gap: 0.15rem;
}

.bottom-nav-item--active {
  color: var(--sidebar-text-active);
}

.bottom-nav-label {
  font-size: 0.58rem;
  font-weight: 500;
  line-height: 1;
}
</style>
