<script setup lang="ts">
import {ref, onMounted, computed} from 'vue'
import {notificationsApi} from '../api/notifications.api.ts'
import {relativeTime} from '@/shared/utils/formatters.ts'
import {useToast} from '@/shared/composables/use-toast.ts'
import {useI18n} from '@/shared/composables/use-i18n.ts'
import type {Notification} from "@/features/notifications/api/notification.ts"
import {useUnreadCount} from '../composables/use-unread-count.ts';

const toast = useToast()
const {t} = useI18n()
const {decrement, reset} = useUnreadCount()

const notifications = ref<Notification[]>([])
const loading = ref(true)
const page = ref(1)
const total = ref(0)
const limit = 20

const filterRead = ref<'all' | 'unread' | 'read'>('all')
const filterType = ref<string>('all')

const markingAll = ref(false)
const deletingId = ref<string | null>(null)

const totalPages = computed(() => Math.ceil(total.value / limit))

const typeOptions = computed(() => [
  {value: 'all', label: t.value.notifTypeAll},
  {value: 'FEEDING_SUCCESS', label: t.value.notifTypeSuccess},
  {value: 'FEEDING_FAILED', label: t.value.notifTypeFailed},
  {value: 'LOW_FOOD_LEVEL', label: t.value.notifTypeLowFood},
  {value: 'DEVICE_STATUS', label: t.value.notifTypeDevice},
])

const typeIcon: Record<string, string> = {
  FEEDING_SUCCESS: '✅',
  FEEDING_FAILED: '❌',
  LOW_FOOD_LEVEL: '⚠️',
  DEVICE_STATUS: '📡',
}

const typeBgClass: Record<string, string> = {
  FEEDING_SUCCESS: 'type-success',
  FEEDING_FAILED: 'type-fail',
  LOW_FOOD_LEVEL: 'type-warn',
  DEVICE_STATUS: 'type-info',
}

async function fetchNotifications() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {page: page.value, limit}
    if (filterRead.value === 'unread') params.isRead = false
    if (filterRead.value === 'read') params.isRead = true
    if (filterType.value !== 'all') params.type = filterType.value
    const res = await notificationsApi.getAll(params)
    notifications.value = res.data
    total.value = res.meta.total
  } catch {
    toast.error(t.value.failedToLoadNotifications)
  } finally {
    loading.value = false
  }
}

onMounted(fetchNotifications)

async function markRead(n: Notification) {
  if (n.isRead) return
  try {
    await notificationsApi.markRead(n.id)
    n.isRead = true
    decrement()
  } catch {
    toast.error(t.value.failedToMarkRead)
  }
}

async function markAllRead() {
  markingAll.value = true
  try {
    await notificationsApi.markAllRead()
    notifications.value.forEach(n => {
      n.isRead = true
    })
    reset()
    toast.success(t.value.allMarkedRead)
  } catch {
    toast.error(t.value.failedToMarkAllRead)
  } finally {
    markingAll.value = false
  }
}

async function remove(n: Notification) {
  deletingId.value = n.id
  try {
    await notificationsApi.remove(n.id)
    if (!n.isRead) decrement()
    notifications.value = notifications.value.filter(x => x.id !== n.id)
    total.value--
  } catch {
    toast.error(t.value.failedToDeleteNotification)
  } finally {
    deletingId.value = null
  }
}

function onFilterChange() {
  page.value = 1
  fetchNotifications()
}
</script>

<template>
  <div class="notif-page">
    <div class="toolbar">
      <div class="filters">
        <select v-model="filterRead" @change="onFilterChange" class="select">
          <option value="all">{{ t.filterAll2 }}</option>
          <option value="unread">{{ t.filterUnread }}</option>
          <option value="read">{{ t.filterRead }}</option>
        </select>
        <select v-model="filterType" @change="onFilterChange" class="select">
          <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
      <div class="toolbar-right">
        <button class="btn-mark-all" :disabled="markingAll" @click="markAllRead">
          {{ markingAll ? t.marking : t.markAllAsRead }}
        </button>
        <RouterLink to="/notifications/settings" class="btn-settings">{{ t.settingsLink }}</RouterLink>
      </div>
    </div>

    <div v-if="loading" class="notif-list">
      <div v-for="i in 5" :key="i" class="skeleton" style="height:72px;border-radius:1rem"></div>
    </div>

    <div v-else-if="notifications.length === 0" class="empty-state">
      <div class="empty-icon">🔔</div>
      <h3>{{ t.noNotifications }}</h3>
      <p>{{ t.allCaughtUp }}</p>
    </div>

    <div v-else class="notif-list">
      <div
          v-for="n in notifications"
          :key="n.id"
          class="notif-item"
          :class="{ unread: !n.isRead }"
          @click="markRead(n)"
      >
        <div class="notif-icon-wrap" :class="typeBgClass[n.type]">
          {{ typeIcon[n.type] ?? '🔔' }}
        </div>
        <div class="notif-body">
          <div class="notif-title">{{ n.title }}</div>
          <div class="notif-msg">{{ n.message }}</div>
          <div class="notif-time">{{ relativeTime(n.createdAt) }}</div>
        </div>
        <button
            class="btn-delete"
            :disabled="deletingId === n.id"
            @click.stop="remove(n)"
            :title="t.delete"
        >
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="14" height="14">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-6 0h6"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="!loading && totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="page--; fetchNotifications()">←</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="page >= totalPages" @click="page++; fetchNotifications()">→</button>
    </div>
  </div>
</template>

<style scoped>
.notif-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.select {
  padding: 0.5rem 0.75rem;
  border: 1.5px solid var(--border);
  border-radius: 0.75rem;
  font-size: 0.85rem;
  font-family: 'Outfit', sans-serif;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
}

.btn-mark-all {
  padding: 0.5rem 0.9rem;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  border-radius: 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-mark-all:hover:not(:disabled) {
  border-color: var(--text-muted);
}

.btn-mark-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-settings {
  padding: 0.5rem 0.9rem;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  border-radius: 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s;
  font-family: 'Outfit', sans-serif;
}

.btn-settings:hover {
  border-color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.empty-state h3 {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.empty-state p {
  font-size: 0.875rem;
  opacity: 0.8;
}

.notif-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  background: var(--bg-card);
  border-radius: 1rem;
  padding: 0.9rem 1rem;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: box-shadow 0.2s;
  position: relative;
}

.notif-item:hover {
  box-shadow: var(--shadow-md);
}

.notif-item.unread {
  background: rgba(196, 135, 90, 0.08);
  border-left: 3px solid var(--text-muted);
}

.notif-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.type-success { background: #E8F8F0; }
.type-fail { background: #FEF0F0; }
.type-warn { background: #FFF8E6; }
.type-info { background: #EEF4FD; }

.notif-body {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.notif-msg {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
  line-height: 1.4;
}

.notif-time {
  font-size: 0.72rem;
  color: var(--text-faint);
  margin-top: 0.25rem;
}

.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-faint);
  padding: 0.2rem;
  border-radius: 0.35rem;
  opacity: 0.4;
  transition: opacity 0.2s, color 0.2s;
  flex-shrink: 0;
}

.notif-item:hover .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  color: #e74c3c;
  opacity: 1;
}

.btn-delete:disabled {
  opacity: 0.3;
}
</style>
