<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { devicesApi } from '../api/devicesApi.ts'
import { petsApi } from '../api/petsApi.ts'
import { notificationsApi } from '../api/notificationsApi.ts'
import { statisticsApi } from '../api/statisticsApi.ts'
import AppSpinner from '../components/AppSpinner.vue'
import { relativeTime, formatDateTime, foodLevelColor } from '../utils/formatters.ts'
import type { Device, FeedingEvent, FoodLevel } from '../api/devicesApi.ts'
import type { StatisticsResponse } from '../api/statisticsApi.ts'

const userName = ref('')
const petsTotal = ref(0)
const devices = ref<Device[]>([])
const foodLevels = ref<Record<string, FoodLevel | null>>({})
const recentEvents = ref<FeedingEvent[]>([])
const unreadCount = ref(0)
const loading = ref(true)

const weekStats = ref<StatisticsResponse | null>(null)

const feedModal = ref(false)
const feedDevice = ref<Device | null>(null)
const portionSize = ref(100)
const feedLoading = ref(false)
const feedSuccess = ref(false)
let feedCloseTimer: ReturnType<typeof setTimeout> | null = null

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
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' })
}

onMounted(async () => {
  const stored = localStorage.getItem('user')
  if (stored) {
    try { userName.value = JSON.parse(stored).name ?? '' } catch { }
  }

  try {
    const [petsRes, devicesRes, unread] = await Promise.all([
      petsApi.getAll({ limit: 1 }),
      devicesApi.getAll({ limit: 5 }),
      notificationsApi.getUnreadCount().catch(() => 0),
    ])

    petsTotal.value = petsRes.total
    devices.value = devicesRes.data
    unreadCount.value = unread

    const firstDevice = devicesRes.data[0]

    const [levelResults, statsResult, ...eventResults] = await Promise.all([
      Promise.all(
        devicesRes.data.map(d =>
          devicesApi.getFoodLevel(d.id)
            .then(fl => ({ id: d.id, fl }))
            .catch(() => ({ id: d.id, fl: null }))
        )
      ),
      firstDevice
        ? statisticsApi.getDeviceStats(firstDevice.id, 'week').catch(() => null)
        : Promise.resolve(null),
      ...devicesRes.data.slice(0, 3).map(d =>
        devicesApi.getEvents(d.id, { limit: 5 })
          .then(r => r.data.map(ev => ({ ...ev, deviceName: d.name })))
          .catch(() => [] as FeedingEvent[])
      ),
    ])

    for (const { id, fl } of levelResults) foodLevels.value[id] = fl

    weekStats.value = statsResult as StatisticsResponse | null

    const allEvents = (eventResults as FeedingEvent[][]).flat()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    recentEvents.value = allEvents.slice(0, 5)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (feedCloseTimer) clearTimeout(feedCloseTimer)
})

function openFeedModal(device: Device) {
  feedDevice.value = device
  portionSize.value = 100
  feedSuccess.value = false
  feedModal.value = true
}

function closeFeedModal() {
  if (feedCloseTimer) clearTimeout(feedCloseTimer)
  feedModal.value = false
  feedDevice.value = null
}

async function confirmFeed() {
  if (!feedDevice.value) return
  feedLoading.value = true
  try {
    await devicesApi.manualFeed(feedDevice.value.id, portionSize.value)
    feedSuccess.value = true
    feedCloseTimer = setTimeout(closeFeedModal, 1500)
  } catch {
  } finally {
    feedLoading.value = false
  }
}
</script>

<template>
  <div class="dashboard">
    <h1 class="greeting">Hello, {{ userName || '...' }}!</h1>

    <!-- Skeleton -->
    <template v-if="loading">
      <div class="summary-grid">
        <div v-for="i in 4" :key="i" class="skeleton" style="height:100px"></div>
      </div>
      <div class="skeleton" style="height:200px"></div>
      <div class="skeleton" style="height:180px"></div>
      <div class="skeleton" style="height:180px"></div>
    </template>

    <template v-else>
      <!-- Summary cards -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-icon">🐾</div>
          <div class="summary-body">
            <p class="summary-value">{{ petsTotal }}</p>
            <p class="summary-label">Pets</p>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon">📡</div>
          <div class="summary-body">
            <p class="summary-value">{{ onlineCount }} / {{ devices.length }}</p>
            <p class="summary-label">Devices online</p>
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
              <p class="summary-label">Last feeding</p>
            </template>
          </div>
        </div>

        <RouterLink to="/notifications" class="summary-card summary-card--link">
          <div class="summary-icon">🔔</div>
          <div class="summary-body">
            <p class="summary-value">{{ unreadCount }}</p>
            <p class="summary-label">Unread alerts</p>
          </div>
        </RouterLink>
      </div>

      <!-- Weekly stats -->
      <div v-if="weekStats" class="section-card">
        <div class="section-header">
          <h2 class="section-title">This week</h2>
          <RouterLink v-if="devices[0]" :to="`/devices/${devices[0].id}/statistics`" class="view-all">Full stats →</RouterLink>
        </div>

        <!-- Mini stat chips -->
        <div class="week-chips">
          <div class="week-chip">
            <span class="chip-value">{{ weekStats.totalFeedings }}</span>
            <span class="chip-label">feedings</span>
          </div>
          <div class="week-chip">
            <span class="chip-value">{{ weekStats.totalFood }}g</span>
            <span class="chip-label">food served</span>
          </div>
          <div class="week-chip">
            <span class="chip-value">{{ weekStats.averagePortion }}g</span>
            <span class="chip-label">avg portion</span>
          </div>
          <div class="week-chip" :class="{ 'chip-warn': successRate !== null && successRate < 80 }">
            <span class="chip-value">{{ successRate !== null ? successRate + '%' : '—' }}</span>
            <span class="chip-label">success rate</span>
          </div>
        </div>

        <!-- Bar chart -->
        <div v-if="weekStats.dailyBreakdown.length" class="week-chart">
          <div
            v-for="d in weekStats.dailyBreakdown"
            :key="d.date"
            class="week-bar-group"
            :title="`${dayLabel(d.date)}: ${d.feedings} feedings, ${d.food}g`"
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

      <!-- Devices quick view -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Devices</h2>
          <RouterLink to="/devices" class="view-all">View all →</RouterLink>
        </div>

        <div v-if="devices.length === 0" class="empty-state">
          <p>No devices yet.</p>
          <RouterLink to="/devices" class="btn-primary">Add device</RouterLink>
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
              :title="device.isOnline ? '' : 'Device is offline'"
              @click="openFeedModal(device)"
            >Feed now</button>
          </div>
        </div>
      </div>

      <!-- Recent events -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Recent feedings</h2>
        </div>

        <div v-if="recentEvents.length === 0" class="empty-state">
          <p>No feeding events yet.</p>
        </div>

        <div v-else class="events-wrap">
          <table class="events-table">
            <thead>
              <tr>
                <th>Time</th><th>Device</th><th>Type</th><th>Portion</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ev in recentEvents" :key="ev.id">
                <td class="td-time">{{ relativeTime(ev.createdAt) }}</td>
                <td class="td-device">{{ ev.deviceName ?? ev.deviceId }}</td>
                <td>
                  <span class="type-badge" :class="ev.type === 'MANUAL' ? 'manual' : 'auto'">
                    {{ ev.type === 'MANUAL' ? '👆 Manual' : '🤖 Auto' }}
                  </span>
                </td>
                <td class="td-portion">{{ ev.portionSize }}g</td>
                <td>
                  <span class="status-badge" :class="ev.success ? 'success' : 'fail'">
                    {{ ev.success ? '✓' : '✗' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Feed Modal -->
    <Teleport to="body">
      <div v-if="feedModal" class="modal-backdrop" @click.self="closeFeedModal">
        <div class="modal">
          <div class="modal-header">
            <h3>Feed now — {{ feedDevice?.name }}</h3>
            <button class="modal-close" @click="closeFeedModal">✕</button>
          </div>

          <div v-if="feedSuccess" class="feed-success">
            <span class="success-icon">✅</span>
            <p>Command sent!</p>
          </div>

          <template v-else>
            <div class="portion-field">
              <label>Portion size: <strong>{{ portionSize }}g</strong></label>
              <input type="range" v-model.number="portionSize" min="10" max="500" step="10" class="slider" />
              <div class="slider-labels"><span>10g</span><span>500g</span></div>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" @click="closeFeedModal">Cancel</button>
              <button class="btn-confirm" :disabled="feedLoading" @click="confirmFeed">
                <AppSpinner v-if="feedLoading" />
                {{ feedLoading ? 'Sending...' : 'Confirm' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 1.5rem; }

.greeting { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 1.75rem; color: #2C1208; }

.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (min-width: 768px) { .summary-grid { grid-template-columns: repeat(4, 1fr); } }

.summary-card {
  background: #fff; border-radius: 1.25rem; padding: 1.25rem;
  display: flex; align-items: center; gap: 0.85rem;
  box-shadow: 0 2px 12px rgba(44,18,8,0.06);
  text-decoration: none; transition: box-shadow 0.2s;
}
.summary-card--link:hover { box-shadow: 0 4px 20px rgba(44,18,8,0.12); }
.summary-icon { font-size: 1.75rem; flex-shrink: 0; }
.summary-value { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 1.3rem; color: #2C1208; line-height: 1.1; }
.summary-label { font-size: 0.78rem; color: #A0522D; margin-top: 0.1rem; }

.section-card {
  background: #fff; border-radius: 1.25rem; padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(44,18,8,0.06);
  display: flex; flex-direction: column; gap: 1rem;
}
.section-header { display: flex; align-items: center; justify-content: space-between; }
.section-title { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 1rem; color: #2C1208; }
.view-all { font-size: 0.8rem; font-weight: 600; color: #A0522D; text-decoration: none; }
.view-all:hover { color: #2C1208; }

.empty-state { font-size: 0.875rem; color: #C4875A; display: flex; flex-direction: column; align-items: flex-start; gap: 0.75rem; }
.btn-primary {
  padding: 0.5rem 1rem; background: #2C1208; color: #F5EDE0;
  border: none; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 600;
  cursor: pointer; text-decoration: none; font-family: 'Outfit', sans-serif; display: inline-block;
}

.week-chips { display: flex; gap: 0.65rem; flex-wrap: wrap; }
.week-chip {
  display: flex; flex-direction: column; gap: 0.1rem;
  background: #F5EDE0; border-radius: 0.85rem; padding: 0.65rem 1rem; flex: 1; min-width: 90px;
}
.week-chip.chip-warn .chip-value { color: #e74c3c; }
.chip-value { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 1.2rem; color: #2C1208; line-height: 1.1; }
.chip-label { font-size: 0.72rem; color: #A0522D; }

.week-chart {
  display: flex; align-items: flex-end; gap: 0.5rem;
  height: 120px; padding: 0 0.25rem;
}
.week-bar-group {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
  cursor: default;
}
.week-bar-track {
  flex: 1; width: 100%; display: flex; align-items: flex-end;
  border-radius: 4px; overflow: hidden;
}
.week-bar-fill {
  width: 100%; min-height: 3px;
  background: linear-gradient(180deg, #A0522D 0%, #7B3A18 100%);
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
  display: flex; align-items: flex-start; justify-content: center; position: relative;
}
.bar-count {
  font-size: 0.65rem; font-weight: 700; color: #fff;
  position: absolute; top: 3px; left: 50%; transform: translateX(-50%);
  line-height: 1; white-space: nowrap;
}
.week-bar-group:hover .week-bar-fill { background: linear-gradient(180deg, #C4875A 0%, #A0522D 100%); }
.week-bar-label { font-size: 0.7rem; color: #A0522D; font-weight: 500; white-space: nowrap; }

.devices-list { display: flex; flex-direction: column; gap: 0.75rem; }
.device-row { display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border-radius: 0.75rem; background: #F5EDE0; }
.device-info { flex: 1; display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
.device-name-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-dot.online { background: #27ae60; }
.status-dot.offline { background: #aaa; }
.device-name { font-weight: 600; font-size: 0.9rem; color: #2C1208; }
.device-location { font-size: 0.78rem; color: #A0522D; }

.food-bar-wrap { display: flex; align-items: center; gap: 0.5rem; }
.food-bar-track { flex: 1; height: 6px; background: #E0D3C0; border-radius: 999px; overflow: hidden; }
.food-bar-fill { height: 100%; border-radius: 999px; transition: width 0.4s; }
.food-pct { font-size: 0.75rem; font-weight: 600; color: #7B3A18; white-space: nowrap; }
.food-pct.low { color: #e74c3c; }

.btn-feed {
  padding: 0.45rem 0.9rem; background: #2C1208; color: #F5EDE0;
  border: none; border-radius: 0.65rem; font-size: 0.8rem; font-weight: 600;
  font-family: 'Outfit', sans-serif; cursor: pointer; white-space: nowrap;
  transition: background 0.2s, opacity 0.2s; flex-shrink: 0;
}
.btn-feed:hover:not(:disabled) { background: #7B3A18; }
.btn-feed:disabled { opacity: 0.4; cursor: not-allowed; }

.events-wrap { overflow-x: auto; }
.events-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; min-width: 480px; }
.events-table th { text-align: left; padding: 0 0.5rem 0.5rem; font-size: 0.75rem; color: #A0522D; font-weight: 600; border-bottom: 1px solid #E0D3C0; }
.events-table td { padding: 0.5rem; border-bottom: 1px solid #F5EDE0; color: #2C1208; }
.events-table tr:last-child td { border-bottom: none; }
.td-time { color: #A0522D; font-size: 0.8rem; white-space: nowrap; }
.td-device { font-weight: 500; }
.td-portion { font-weight: 600; }

.type-badge { font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 999px; font-weight: 600; white-space: nowrap; }
.type-badge.manual { background: #E8F4FD; color: #2980b9; }
.type-badge.auto { background: #F0FBF5; color: #27ae60; }

.status-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; font-weight: 700; font-size: 0.75rem; }
.status-badge.success { background: #E8F8F0; color: #27ae60; }
.status-badge.fail { background: #FEF0F0; color: #e74c3c; }
</style>
