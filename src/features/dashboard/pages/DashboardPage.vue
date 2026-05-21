<script setup lang="ts">
import {ref, onMounted, onBeforeUnmount, computed} from 'vue'
import {devicesApi} from '@/features/devices/api/devices.api.ts'
import {petsApi} from '@/features/pets/api/pets.api.ts'
import {notificationsApi} from '@/features/notifications/api/notifications.api.ts'
import {statisticsApi} from '@/features/statistics/api/statistics.api.ts'
import {foodLevelColor, formatDateTime} from '@/shared/utils/formatters.ts'
import {useToast} from '@/shared/composables/use-toast.ts'
import {useFeedModal} from '@/features/devices/composables/use-feed-modal.ts'
import {useSocket} from '@/shared/composables/use-socket.ts'
import {getCurrentUser} from '@/shared/composables/use-current-user.ts'
import FeedModal from '@/features/devices/components/FeedModal.vue'
import FeedingEventsTable from '@/features/devices/components/FeedingEventsTable.vue'
import type {Device} from "@/features/devices/api/device.ts";
import type {FoodLevel} from "@/features/devices/api/food-level.ts";
import type {FeedingEvent} from "@/features/devices/api/feeding-event.ts";
import type {StatisticsResponse} from "@/features/statistics/api/statistics-response.ts";
import {useI18n} from '@/shared/composables/use-i18n.ts'

const toast = useToast()
const {t} = useI18n()
const {
  feedModal,
  feedDevice,
  portionSize,
  feedLoading,
  feedPending,
  feedSuccess,
  feedError,
  openFeedModal,
  closeFeedModal,
  confirmFeed
} = useFeedModal()

const socket = useSocket()

function onFoodLevel(data: { deviceId: string; level: number }) {
  if (foodLevels.value[data.deviceId] !== undefined) {
    foodLevels.value[data.deviceId] = {
      ...(foodLevels.value[data.deviceId] ?? {}),
      level: data.level,
      timestamp: new Date().toISOString(),
    } as FoodLevel
  }
}

function onDeviceStatus(data: { deviceId: string; isOnline: boolean; lastSeen: string }) {
  const device = devices.value.find(d => d.id === data.deviceId)
  if (device) {
    device.isOnline = data.isOnline
    device.lastSeen = data.lastSeen
  }
}

const userName = ref('')
const petsTotal = ref(0)
const devices = ref<Device[]>([])
const foodLevels = ref<Record<string, FoodLevel | null>>({})
const recentEvents = ref<FeedingEvent[]>([])
const unreadCount = ref(0)
const loading = ref(true)

const weekStats = ref<StatisticsResponse | null>(null)

const onlineCount = computed(() => devices.value.filter(d => d.isOnline).length)
const lastEvent = computed(() => recentEvents.value[0] ?? null)

const successRate = computed(() => {
  if (!weekStats.value || weekStats.value.totalFeedings === 0) return null
  return Math.round((weekStats.value.successfulFeedings / weekStats.value.totalFeedings) * 100)
})

const chartMax = computed(() => {
  if (!weekStats.value?.dailyBreakdown.length) return 1
  return Math.max(...weekStats.value.dailyBreakdown.map(d => d.feedings)) || 1
})

function dayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {weekday: 'short'})
}

onMounted(async () => {
  userName.value = getCurrentUser()?.name ?? ''

  try {
    const [petsRes, devicesRes, unread] = await Promise.all([
      petsApi.getAll({limit: 1}).catch(() => ({data: [], meta: {total: 0, page: 1, limit: 1, totalPages: 0, hasNextPage: false, hasPreviousPage: false}})),
      devicesApi.getAll({limit: 5}).catch(() => ({data: [], meta: {total: 0, page: 1, limit: 5, totalPages: 0, hasNextPage: false, hasPreviousPage: false}})),
      notificationsApi.getUnreadCount().catch(() => 0),
    ])

    petsTotal.value = petsRes.meta.total
    devices.value = devicesRes.data
    unreadCount.value = unread

    const firstDevice = devicesRes.data[0]

    const [levelResults, statsResult, ...eventResults] = await Promise.all([
      Promise.all(
          devicesRes.data.map(d =>
              devicesApi.getFoodLevel(d.id)
                  .then(fl => ({id: d.id, fl}))
                  .catch(() => ({id: d.id, fl: null}))
          )
      ),
      firstDevice
          ? statisticsApi.getDeviceStats(firstDevice.id, 'week').catch(() => null)
          : Promise.resolve(null),
      ...devicesRes.data.slice(0, 3).map(d =>
          devicesApi.getEvents(d.id, {limit: 5})
              .then(r => r.data.map(ev => ({...ev, deviceName: d.name})))
              .catch(() => [] as FeedingEvent[])
      ),
    ])

    for (const {id, fl} of levelResults) foodLevels.value[id] = fl

    weekStats.value = statsResult as StatisticsResponse | null

    const allEvents = (eventResults as FeedingEvent[][]).flat()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    recentEvents.value = allEvents.slice(0, 5)
  } catch {
    toast.error(t.value.failedToLoad)
  } finally {
    loading.value = false
  }

  socket.on('food:level', onFoodLevel)
  socket.on('device:status', onDeviceStatus)
})

onBeforeUnmount(() => {
  socket.off('food:level', onFoodLevel)
  socket.off('device:status', onDeviceStatus)
})

</script>

<template>
  <div class="dashboard">
    <h1 class="greeting">{{ t.hello }}, {{ userName || '...' }}!</h1>

    <template v-if="loading">
      <div class="summary-grid">
        <div v-for="i in 4" :key="i" class="skeleton" style="height:100px"></div>
      </div>
      <div class="skeleton" style="height:200px"></div>
      <div class="skeleton" style="height:180px"></div>
      <div class="skeleton" style="height:180px"></div>
    </template>

    <template v-else>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-icon">🐾</div>
          <div class="summary-body">
            <p class="summary-value">{{ petsTotal }}</p>
            <p class="summary-label">{{ t.petsLabel }}</p>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon">📡</div>
          <div class="summary-body">
            <p class="summary-value">{{ onlineCount }} / {{ devices.length }}</p>
            <p class="summary-label">{{ t.devicesOnline }}</p>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon">🍽️</div>
          <div class="summary-body">
            <template v-if="lastEvent">
              <p class="summary-value">{{ lastEvent.portionSize }}g</p>
              <p class="summary-label">{{ formatDateTime(lastEvent.createdAt) }}</p>
            </template>
            <template v-else>
              <p class="summary-value">—</p>
              <p class="summary-label">{{ t.lastFeeding }}</p>
            </template>
          </div>
        </div>

        <RouterLink to="/notifications" class="summary-card summary-card--link">
          <div class="summary-icon">🔔</div>
          <div class="summary-body">
            <p class="summary-value">{{ unreadCount }}</p>
            <p class="summary-label">{{ t.unreadAlerts }}</p>
          </div>
        </RouterLink>
      </div>

      <div v-if="weekStats" class="section-card">
        <div class="section-header">
          <h2 class="section-title">{{ t.thisWeek }}</h2>
          <RouterLink v-if="devices[0]" :to="`/devices/${devices[0].id}/statistics`" class="view-all">{{ t.fullStats }}
          </RouterLink>
        </div>

        <div class="week-chips">
          <div class="week-chip">
            <span class="chip-value">{{ weekStats.totalFeedings }}</span>
            <span class="chip-label">{{ t.feedings }}</span>
          </div>
          <div class="week-chip">
            <span class="chip-value">{{ weekStats.totalFood }}g</span>
            <span class="chip-label">{{ t.foodServed }}</span>
          </div>
          <div class="week-chip">
            <span class="chip-value">{{ weekStats.averagePortion }}g</span>
            <span class="chip-label">{{ t.avgPortion }}</span>
          </div>
          <div class="week-chip" :class="{ 'chip-warn': successRate !== null && successRate < 80 }">
            <span class="chip-value">{{ successRate !== null ? successRate + '%' : '—' }}</span>
            <span class="chip-label">{{ t.successRate }}</span>
          </div>
        </div>

        <div v-if="weekStats.dailyBreakdown.length" class="week-chart">
          <div
              v-for="d in weekStats.dailyBreakdown"
              :key="d.date"
              class="week-bar-group"
              :title="`${dayLabel(d.date)}: ${d.feedings} ${t.feedings}, ${d.food}g`"
          >
            <div class="week-bar-track">
              <div
                  class="week-bar-fill"
                  :style="{ height: (d.feedings / chartMax * 100) + '%' }"
              >
                <span v-if="d.feedings > 0" class="bar-count">{{ d.feedings }}</span>
              </div>
            </div>
            <div class="week-bar-label">{{ dayLabel(d.date) }}</div>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">{{ t.devicesTitle }}</h2>
          <RouterLink to="/devices" class="view-all">{{ t.viewAll }}</RouterLink>
        </div>

        <div v-if="devices.length === 0" class="empty-state">
          <p>{{ t.noDevicesYet }}</p>
          <RouterLink to="/devices" class="btn-primary">{{ t.addDevice }}</RouterLink>
        </div>

        <div v-else class="devices-list">
          <div v-for="device in devices" :key="device.id" class="device-row">
            <div class="device-info">
              <div class="device-name-row">
                <span class="status-dot" :class="device.isOnline ? 'online' : 'offline'"></span>
                <span class="device-name">{{ device.name }}</span>
                <span v-if="device.location" class="device-location">{{ device.location }}</span>
              </div>
              <div class="food-bar-wrap">
                <div class="food-bar-track">
                  <div
                      class="food-bar-fill"
                      :style="{
                      width: (foodLevels[device.id]?.level ?? 0) + '%',
                      background: foodLevelColor(foodLevels[device.id]?.level ?? 0),
                    }"
                  ></div>
                </div>
                <span class="food-pct" :class="{ low: (foodLevels[device.id]?.level ?? 100) < 20 }">
                  <span v-if="(foodLevels[device.id]?.level ?? 100) < 20">⚠️ </span>
                  {{ foodLevels[device.id] ? foodLevels[device.id]!.level + '%' : '—' }}
                </span>
              </div>
            </div>
            <button
                class="btn-feed"
                :disabled="!device.isOnline"
                :title="device.isOnline ? '' : t.deviceIsOffline"
                @click="openFeedModal(device)"
            >{{ t.feedNow }}
            </button>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">{{ t.recentFeedingsTitle }}</h2>
        </div>

        <div v-if="recentEvents.length === 0" class="empty-state">
          <p>{{ t.noFeedingEventsYet }}</p>
        </div>

        <FeedingEventsTable v-else :events="recentEvents" :show-device="true" time-format="relative"/>
      </div>
    </template>

    <FeedModal
        v-if="feedModal"
        :device-name="feedDevice?.name"
        :portion-size="portionSize"
        :loading="feedLoading"
        :pending="feedPending"
        :success="feedSuccess"
        :error="feedError"
        @update:portion-size="portionSize = $event"
        @confirm="confirmFeed"
        @close="closeFeedModal"
    />
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.greeting {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.4rem;
  color: var(--text-primary);
}

@media (min-width: 480px) {
  .greeting {
    font-size: 1.75rem;
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .summary-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.summary-card {
  background: var(--bg-card);
  border-radius: 1.25rem;
  padding: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: var(--shadow-sm);
  text-decoration: none;
  transition: box-shadow 0.2s;
}

@media (min-width: 480px) {
  .summary-card {
    padding: 1.25rem;
    gap: 0.85rem;
  }
}

.summary-card--link:hover {
  box-shadow: var(--shadow-md);
}

.summary-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}

@media (min-width: 480px) {
  .summary-icon {
    font-size: 1.75rem;
  }
}

.summary-value {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--text-primary);
  line-height: 1.1;
}

@media (min-width: 480px) {
  .summary-value {
    font-size: 1.3rem;
  }
}

.summary-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
}

.section-card {
  background: var(--bg-card);
  border-radius: 1.25rem;
  padding: 1rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 480px) {
  .section-card {
    padding: 1.5rem;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
}

.view-all {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
}

.view-all:hover {
  color: var(--text-primary);
}

.empty-state {
  font-size: 0.875rem;
  color: var(--text-faint);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: var(--brown-dark);
  color: var(--bg-page);
  border: none;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  font-family: 'Outfit', sans-serif;
  display: inline-block;
}

.week-chips {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.week-chip {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  background: var(--bg-page);
  border-radius: 0.85rem;
  padding: 0.65rem 1rem;
  flex: 1;
  min-width: 90px;
}

.week-chip.chip-warn .chip-value {
  color: #e74c3c;
}

.chip-value {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.2rem;
  color: var(--text-primary);
  line-height: 1.1;
}

.chip-label {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.week-chart {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  height: 120px;
  padding: 0 0.25rem;
}

.week-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  cursor: default;
}

.week-bar-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  border-radius: 4px;
  overflow: hidden;
}

.week-bar-fill {
  width: 100%;
  min-height: 3px;
  background: linear-gradient(180deg, #A0522D 0%, #7B3A18 100%);
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  position: relative;
}

.bar-count {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--bg-card);
  position: absolute;
  top: 3px;
  left: 50%;
  transform: translateX(-50%);
  line-height: 1;
  white-space: nowrap;
}

.week-bar-group:hover .week-bar-fill {
  background: linear-gradient(180deg, #C4875A 0%, #A0522D 100%);
}

.week-bar-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
}

.devices-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.device-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: var(--bg-page);
}

.device-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.device-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online {
  background: #27ae60;
}

.status-dot.offline {
  background: #aaa;
}

.device-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.device-location {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.food-bar-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.food-bar-track {
  flex: 1;
  height: 6px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.food-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s;
}

.food-pct {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.food-pct.low {
  color: #e74c3c;
}

.btn-feed {
  padding: 0.45rem 0.9rem;
  background: var(--brown-light);
  color: #fdf6ec;
  border: none;
  border-radius: 0.65rem;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, opacity 0.2s;
  flex-shrink: 0;
}

.btn-feed:hover:not(:disabled) {
  background: var(--brown-mid);
}

.btn-feed:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.events-wrap {
  overflow-x: auto;
}

.events-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.events-table th {
  text-align: left;
  padding: 0 0.5rem 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  border-bottom: 1px solid var(--border);
}

.events-table td {
  padding: 0.5rem;
  border-bottom: 1px solid var(--bg-page);
  color: var(--text-primary);
}

.events-table tr:last-child td {
  border-bottom: none;
}

.td-time {
  color: var(--text-muted);
  font-size: 0.8rem;
  white-space: nowrap;
}

.td-device {
  font-weight: 500;
}

.td-portion {
  font-weight: 600;
}

.type-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-weight: 600;
  white-space: nowrap;
}

.type-badge.manual {
  background: #E8F4FD;
  color: #2980b9;
}

.type-badge.auto {
  background: #F0FBF5;
  color: #27ae60;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.75rem;
}

.status-badge.success {
  background: #E8F8F0;
  color: #27ae60;
}

.status-badge.fail {
  background: #FEF0F0;
  color: #e74c3c;
}
</style>
