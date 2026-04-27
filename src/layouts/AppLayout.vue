<script setup lang="ts">
import {ref, onMounted, onUnmounted, computed} from 'vue'
import {RouterLink, RouterView, useRouter, useRoute} from 'vue-router'
import {authApi} from '../api/authApi.ts'
import {notificationsApi} from '../api/notificationsApi.ts'
import AppLogo from '../components/AppLogo.vue'

const router = useRouter()
const route = useRoute()

const unreadCount = ref(0)
const user = ref<{ name: string; email: string } | null>(null)

const userInitials = computed(() => {
  if (!user.value?.name) return '?'
  return user.value.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
})

const pageTitle = computed(() => {
  const path = route.path
  if (path.startsWith('/dashboard')) return 'Dashboard'
  if (path.startsWith('/pets')) return 'Pets'
  if (path.startsWith('/devices')) return 'Devices'
  if (path.startsWith('/notifications')) return 'Notifications'
  if (path.startsWith('/profile')) return 'Profile'
  return 'FeedlyPet'
})

onMounted(() => {
  const stored = localStorage.getItem('user')
  if (stored) user.value = JSON.parse(stored)
  fetchUnreadCount()
  const interval = setInterval(fetchUnreadCount, 30_000)
  onUnmounted(() => clearInterval(interval))
})

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

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
  },
  {
    to: '/pets',
    label: 'Pets',
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
  },
  {
    to: '/devices',
    label: 'Devices',
    icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18'
  },
  {
    to: '/notifications',
    label: 'Alerts',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    notifications: true
  },
  {to: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'},
]
</script>

<template>
  <div class="layout">

    <aside class="sidebar">
      <div class="sidebar-logo">
        <AppLogo variant="dark" :size="36"/>
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
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Log out
        </button>
      </div>
    </aside>

    <div class="main-wrap">
      <header class="header">
        <h1 class="header-title">{{ pageTitle }}</h1>
        <div class="header-right">
          <RouterLink to="/notifications" class="bell-btn">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <span v-if="unreadCount > 0" class="bell-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </RouterLink>
          <RouterLink to="/profile" class="avatar header-avatar">{{ userInitials }}</RouterLink>
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
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
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
  background: #F5EDE0;
  display: flex;
}

.sidebar {
  display: none;
  width: 260px;
  background: #2C1208;
  flex-direction: column;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  height: 100vh;
  z-index: 20;
}

@media (min-width: 768px) {
  .sidebar {
    display: flex;
  }
}

.sidebar-logo {
  height: 56px;
  padding: 0 1.5rem;
  border-bottom: 1px solid rgba(245, 237, 224, 0.08);
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.35rem;
  color: #F5EDE0;
}

.logo-text span {
  color: #C4875A;
}

.sidebar-nav {
  flex: 1;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 1rem;
  border-radius: 0.75rem;
  color: rgba(245, 237, 224, 0.6);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;
}

.nav-item:hover {
  background: rgba(245, 237, 224, 0.08);
  color: #F5EDE0;
}

.nav-item--active {
  background: rgba(196, 135, 90, 0.2);
  color: #C4875A;
}

.nav-icon {
  width: 1.2rem;
  height: 1.2rem;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
}

.badge {
  background: #A0522D;
  color: #F5EDE0;
  font-size: 0.7rem;
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
  padding: 1rem;
  border-top: 1px solid rgba(245, 237, 224, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.25rem 0.25rem;
}

.avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #A0522D;
  color: #F5EDE0;
  font-size: 0.75rem;
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
  font-size: 0.85rem;
  font-weight: 600;
  color: #F5EDE0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 0.72rem;
  color: rgba(245, 237, 224, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.6rem;
  background: none;
  border: none;
  color: rgba(245, 237, 224, 0.45);
  font-size: 0.85rem;
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
}

@media (min-width: 768px) {
  .main-wrap {
    margin-left: 260px;
  }
}

.header {
  background: #fff;
  border-bottom: 1px solid #E0D3C0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
  color: #2C1208;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bell-btn {
  position: relative;
  color: #7B3A18;
  display: flex;
  align-items: center;
  padding: 0.25rem;
  border-radius: 0.5rem;
  transition: color 0.2s;
}

.bell-btn:hover {
  color: #2C1208;
}

.bell-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #A0522D;
  color: #F5EDE0;
  font-size: 0.6rem;
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
  text-decoration: none;
  transition: ring 0.2s;
}

.header-avatar:hover {
  opacity: 0.85;
}

.content {
  flex: 1;
  padding: 1.5rem;
  padding-bottom: 5rem;
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
  background: #2C1208;
  border-top: 1px solid rgba(245, 237, 224, 0.08);
  z-index: 20;
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
  padding: 0.65rem 0;
  color: rgba(245, 237, 224, 0.45);
  text-decoration: none;
  position: relative;
  transition: color 0.2s;
}

.bottom-nav-item--active {
  color: #C4875A;
}

.bottom-nav-label {
  font-size: 0.62rem;
  margin-top: 0.2rem;
  font-weight: 500;
}
</style>
