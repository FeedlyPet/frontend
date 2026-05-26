<script setup lang="ts">
import {ref, onMounted, computed, watch} from 'vue'
import {useRoute} from 'vue-router'
import {statisticsApi} from '../api/statistics.api.ts'
import {formatDate} from '@/shared/utils/formatters.ts'
import type {StatisticsPeriod} from '../api/statistics.api.ts'
import {useToast} from '@/shared/composables/use-toast.ts'
import type {StatisticsResponse} from "@/features/statistics/api/statistics-response.ts";

const toast = useToast()

const route = useRoute()
const deviceId = route.params.deviceId as string

const stats = ref<StatisticsResponse | null>(null)
const loading = ref(true)
const period = ref<StatisticsPeriod>('week')
const chartMode = ref<'feedings' | 'food'>('feedings')

onMounted(() => fetchStats())
watch(period, fetchStats)

async function fetchStats() {
  loading.value = true
  try {
    stats.value = await statisticsApi.getDeviceStats(deviceId, period.value)
  } catch {
    stats.value = null
    toast.error('Failed to load statistics')
  } finally {
    loading.value = false
  }
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  text: string
}

const tooltip = ref<TooltipState>({visible: false, x: 0, y: 0, text: ''})

function showTooltip(e: MouseEvent, d: { date: string; feedings: number; food: number }) {
  const container = (e.currentTarget as HTMLElement).closest('.chart-body') as HTMLElement
  if (!container) return
  const rect = container.getBoundingClientRect()
  const barRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  tooltip.value = {
    visible: true,
    x: barRect.left - rect.left + barRect.width / 2,
    y: barRect.top - rect.top - 8,
    text: chartMode.value === 'feedings' ? `${d.feedings} feedings` : `${d.food}g food`,
  }
}

function hideTooltip() {
  tooltip.value.visible = false
}

function changeSign(val: number) {
  if (val > 0) return 'positive'
  if (val < 0) return 'negative'
  return 'neutral'
}

function formatChange(val: number) {
  if (val === 0) return '—'
  return (val > 0 ? '+' : '') + val.toFixed(1) + '%'
}

const chartData = computed(() => {
  if (!stats.value) return []
  return stats.value.dailyBreakdown
})

const chartMax = computed(() => {
  if (!chartData.value.length) return 1
  const max = Math.max(...chartData.value.map(d => chartMode.value === 'feedings' ? d.feedings : d.food))
  return max || 1
})

const successRate = computed(() => {
  if (!stats.value || stats.value.totalFeedings === 0) return 0
  return Math.round((stats.value.successfulFeedings / stats.value.totalFeedings) * 100)
})
</script>

<template>
  <div class="stats-page">
    <RouterLink :to="`/devices/${deviceId}`" class="breadcrumb">← Device</RouterLink>

    <div class="page-header">
      <h2 class="page-title">Statistics</h2>
      <div class="period-tabs">
        <button class="tab-btn" :class="{ active: period === 'week' }" @click="period = 'week'">Week</button>
        <button class="tab-btn" :class="{ active: period === 'month' }" @click="period = 'month'">Month</button>
        <button class="tab-btn" :class="{ active: period === 'year' }" @click="period = 'year'">Year</button>
      </div>
    </div>

    <template v-if="loading">
      <div class="summary-grid">
        <div v-for="i in 6" :key="i" class="skeleton" style="height:90px"></div>
      </div>
      <div class="skeleton" style="height:200px"></div>
    </template>

    <div v-else-if="!stats" class="empty-state">
      <div class="empty-icon">📊</div>
      <h3>No data available</h3>
      <p>No feeding events found for this period</p>
    </div>

    <template v-else>
      <p class="period-label">
        {{ formatDate(stats.period.start) }} — {{ formatDate(stats.period.end) }}
      </p>

      <div class="summary-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalFeedings }}</div>
          <div class="stat-label">Total feedings</div>
          <div class="stat-change" :class="changeSign(stats.comparison.feedingsChange)">
            {{ formatChange(stats.comparison.feedingsChange) }}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ stats.totalFood }}g</div>
          <div class="stat-label">Total food</div>
          <div class="stat-change" :class="changeSign(stats.comparison.foodChange)">
            {{ formatChange(stats.comparison.foodChange) }}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ stats.averagePortion }}g</div>
          <div class="stat-label">Avg portion</div>
          <div class="stat-change neutral">—</div>
        </div>

        <div class="stat-card">
          <div class="stat-value" :class="successRate < 80 ? 'warn' : ''">{{ successRate }}%</div>
          <div class="stat-label">Success rate</div>
          <div class="stat-sub">{{ stats.successfulFeedings }} ok · {{ stats.failedFeedings }} failed</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ stats.automaticFeedings }}</div>
          <div class="stat-label">Automatic</div>
          <div class="stat-sub">🤖 scheduled</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ stats.manualFeedings }}</div>
          <div class="stat-label">Manual</div>
          <div class="stat-sub">👆 by hand</div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">Daily breakdown</h3>
          <div class="chart-mode-tabs">
            <button class="tab-btn-sm" :class="{ active: chartMode === 'feedings' }" @click="chartMode = 'feedings'">
              Feedings
            </button>
            <button class="tab-btn-sm" :class="{ active: chartMode === 'food' }" @click="chartMode = 'food'">Food (g)
            </button>
          </div>
        </div>

        <div v-if="chartData.length === 0" class="chart-empty">No data</div>

        <div v-else class="chart-body">
          <div
              v-for="d in chartData"
              :key="d.date"
              class="bar-group"
              @mouseenter="showTooltip($event, d)"
              @mouseleave="hideTooltip"
          >
            <div class="bar-wrap">
              <div
                  class="bar"
                  :style="{ height: ((chartMode === 'feedings' ? d.feedings : d.food) / chartMax * 100) + '%' }"
              ></div>
            </div>
            <div class="bar-label">{{ d.date.slice(5) }}</div>
          </div>

          <div
              v-if="tooltip.visible"
              class="chart-tooltip"
              :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
          >
            {{ tooltip.text }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.breadcrumb {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
}

.breadcrumb:hover {
  color: var(--text-primary);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.page-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.3rem;
  color: var(--text-primary);
}

.period-tabs {
  display: flex;
  gap: 0.25rem;
  background: var(--border);
  border-radius: 0.75rem;
  padding: 0.2rem;
}

.tab-btn {
  padding: 0.4rem 0.9rem;
  border: none;
  border-radius: 0.6rem;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  background: none;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.tab-btn.active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.period-label {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}

.stat-card {
  background: var(--bg-card);
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stat-value {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.5rem;
  color: var(--text-primary);
  line-height: 1.1;
}

.stat-value.warn {
  color: #e74c3c;
}

.stat-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 500;
}

.stat-change {
  font-size: 0.78rem;
  font-weight: 700;
  margin-top: 0.1rem;
}

.stat-change.positive {
  color: #27ae60;
}

.stat-change.negative {
  color: #e74c3c;
}

.stat-change.neutral {
  color: var(--text-faint);
}

.stat-sub {
  font-size: 0.72rem;
  color: var(--text-faint);
  margin-top: 0.1rem;
}

.chart-card {
  background: var(--bg-card);
  border-radius: 1.25rem;
  padding: 1.25rem 1.5rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chart-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.chart-mode-tabs {
  display: flex;
  gap: 0.25rem;
  background: var(--bg-page);
  border-radius: 0.5rem;
  padding: 0.15rem;
}

.tab-btn-sm {
  padding: 0.25rem 0.65rem;
  border: none;
  border-radius: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  background: none;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.tab-btn-sm.active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.chart-empty {
  font-size: 0.875rem;
  color: var(--text-faint);
  text-align: center;
  padding: 2rem 0;
}

.chart-body {
  display: flex;
  align-items: stretch;
  gap: 0.35rem;
  height: 160px;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  position: relative;
}

.chart-tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  background: var(--brown-dark);
  color: var(--bg-page);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border-radius: 0.4rem;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  animation: tooltip-fade 0.15s ease;
}

.chart-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--brown-dark);
}

@keyframes tooltip-fade {
  from {
    opacity: 0;
    transform: translate(-50%, -90%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%);
  }
}

.bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  flex: 1;
  min-width: 28px;
}

.bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}

.bar {
  width: 100%;
  min-height: 2px;
  border-radius: 4px 4px 0 0;
  background: var(--text-muted);
  transition: height 0.4s ease;
}

.bar-group:hover .bar {
  background: var(--text-secondary);
}

.bar-label {
  font-size: 0.65rem;
  color: var(--text-faint);
  white-space: nowrap;
}
</style>
