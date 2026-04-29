<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { devicesApi } from '../api/devicesApi.ts'
import { formatDateTime } from '../utils/formatters.ts'
import type { FeedingEvent } from '../api/devicesApi.ts'

const route = useRoute()
const router = useRouter()
const deviceId = route.params.deviceId as string

const events = ref<FeedingEvent[]>([])
const loading = ref(true)
const total = ref(0)
const limit = 20

const page = ref(Number(route.query.page) || 1)
const filterType = ref((route.query.type as string) || 'all')
const filterSuccess = ref((route.query.success as string) || 'all')
const startDate = ref((route.query.startDate as string) || '')
const endDate = ref((route.query.endDate as string) || '')

const totalPages = computed(() => Math.ceil(total.value / limit))

function syncUrl() {
  router.replace({
    query: {
      ...(page.value > 1 ? { page: page.value } : {}),
      ...(filterType.value !== 'all' ? { type: filterType.value } : {}),
      ...(filterSuccess.value !== 'all' ? { success: filterSuccess.value } : {}),
      ...(startDate.value ? { startDate: startDate.value } : {}),
      ...(endDate.value ? { endDate: endDate.value } : {}),
    },
  })
}

async function fetchEvents() {
  loading.value = true
  try {
    const params: Record<string, unknown> = { page: page.value, limit }
    if (filterType.value !== 'all') params.type = filterType.value
    if (filterSuccess.value !== 'all') params.success = filterSuccess.value === 'true'
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const res = await devicesApi.getEvents(deviceId, params as any)
    events.value = res.data
    total.value = res.total
  } catch {
  } finally {
    loading.value = false
  }
}

onMounted(fetchEvents)

watch([filterType, filterSuccess, startDate, endDate], () => {
  page.value = 1
  syncUrl()
  fetchEvents()
})

watch(page, () => {
  syncUrl()
  fetchEvents()
})

function clearFilters() {
  filterType.value = 'all'
  filterSuccess.value = 'all'
  startDate.value = ''
  endDate.value = ''
}

const hasFilters = computed(() =>
  filterType.value !== 'all' || filterSuccess.value !== 'all' || startDate.value || endDate.value
)
</script>

<template>
  <div class="events-page">
    <RouterLink :to="`/devices/${deviceId}`" class="breadcrumb">← Device</RouterLink>

    <div class="page-header">
      <h2 class="page-title">Feeding history</h2>
      <span v-if="!loading" class="total-count">{{ total }} events</span>
    </div>

    <!-- Filters -->
    <div class="filters-card">
      <div class="filters-row">
        <div class="filter-group">
          <label>Type</label>
          <select v-model="filterType" class="filter-select">
            <option value="all">All types</option>
            <option value="MANUAL">👆 Manual</option>
            <option value="SCHEDULED">🤖 Automatic</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select v-model="filterSuccess" class="filter-select">
            <option value="all">All</option>
            <option value="true">✓ Successful</option>
            <option value="false">✗ Failed</option>
          </select>
        </div>
        <div class="filter-group">
          <label>From</label>
          <input v-model="startDate" type="date" class="filter-input" />
        </div>
        <div class="filter-group">
          <label>To</label>
          <input v-model="endDate" type="date" class="filter-input" />
        </div>
        <button v-if="hasFilters" class="btn-clear" @click="clearFilters">Clear filters</button>
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="table-wrap">
      <div v-for="i in 6" :key="i" class="skeleton" style="height:44px;border-radius:0.5rem"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="events.length === 0" class="empty-state">
      <div class="empty-icon">🍽️</div>
      <h3>No events found</h3>
      <p v-if="hasFilters">Try clearing the filters</p>
      <p v-else>No feeding events yet</p>
    </div>

    <!-- Table -->
    <div v-else class="table-wrap">
      <table class="events-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Type</th>
            <th>Portion</th>
            <th>Status</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ev in events" :key="ev.id">
            <td class="td-time">{{ formatDateTime(ev.createdAt) }}</td>
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
            <td class="td-note">
              <span v-if="ev.errorMessage" class="error-note" :title="ev.errorMessage">
                {{ ev.errorMessage.length > 40 ? ev.errorMessage.slice(0, 40) + '…' : ev.errorMessage }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="page--">←</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="page >= totalPages" @click="page++">→</button>
    </div>
  </div>
</template>

<style scoped>
.events-page { display: flex; flex-direction: column; gap: 1.25rem; }

.breadcrumb { font-size: 0.85rem; font-weight: 600; color: #A0522D; text-decoration: none; }
.breadcrumb:hover { color: #2C1208; }

.page-header { display: flex; align-items: center; gap: 1rem; }
.page-title { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 1.3rem; color: #2C1208; }
.total-count { font-size: 0.82rem; color: #A0522D; font-weight: 600; }

.filters-card {
  background: #fff; border-radius: 1rem; padding: 1rem 1.25rem;
  box-shadow: 0 2px 10px rgba(44,18,8,0.06);
}
.filters-row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end; }
.filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
.filter-group label { font-size: 0.75rem; font-weight: 600; color: #7B3A18; }
.filter-select, .filter-input {
  padding: 0.5rem 0.7rem;
  border: 1.5px solid #E0D3C0; border-radius: 0.65rem;
  font-size: 0.85rem; font-family: 'Outfit', sans-serif;
  background: #F5EDE0; color: #2C1208; outline: none; cursor: pointer;
}
.filter-select:focus, .filter-input:focus { border-color: #A0522D; background: #fff; }
.btn-clear {
  padding: 0.5rem 0.9rem; border: 1.5px solid #E0D3C0; background: #fff;
  border-radius: 0.65rem; font-size: 0.8rem; font-weight: 600; color: #7B3A18;
  cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.2s; white-space: nowrap;
}
.btn-clear:hover { border-color: #A0522D; }

.empty-state {
  text-align: center; padding: 3rem 1rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: #A0522D;
}
.empty-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.empty-state h3 { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 1.1rem; color: #2C1208; }
.empty-state p { font-size: 0.875rem; opacity: 0.8; }

.table-wrap { overflow-x: auto; display: flex; flex-direction: column; gap: 0.5rem; }
.events-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; min-width: 520px; background: #fff; border-radius: 1rem; overflow: hidden; box-shadow: 0 2px 10px rgba(44,18,8,0.06); }
.events-table th { text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; color: #A0522D; font-weight: 600; border-bottom: 1px solid #E0D3C0; background: #FDFAF7; }
.events-table td { padding: 0.65rem 1rem; border-bottom: 1px solid #F5EDE0; color: #2C1208; }
.events-table tr:last-child td { border-bottom: none; }
.events-table tr:hover td { background: #FDFAF7; }

.td-time { color: #A0522D; font-size: 0.82rem; white-space: nowrap; }
.td-portion { font-weight: 600; }
.td-note { font-size: 0.8rem; color: #C4875A; max-width: 200px; }

.type-badge { font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 999px; font-weight: 600; white-space: nowrap; }
.type-badge.manual { background: #E8F4FD; color: #2980b9; }
.type-badge.auto { background: #F0FBF5; color: #27ae60; }

.status-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; font-weight: 700; font-size: 0.75rem; }
.status-badge.success { background: #E8F8F0; color: #27ae60; }
.status-badge.fail { background: #FEF0F0; color: #e74c3c; }

.error-note { color: #e74c3c; font-size: 0.78rem; cursor: help; }
</style>
