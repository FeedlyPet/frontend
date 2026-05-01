<script setup lang="ts">
import {formatDateTime, relativeTime} from '@/shared/utils/formatters.ts'
import type {FeedingEvent} from '@/features/devices/api/feeding-event.ts'

defineProps<{
  events: FeedingEvent[]
  showDevice?: boolean
  timeFormat?: 'datetime' | 'relative'
}>()
</script>

<template>
  <div class="events-wrap">
    <table class="events-table">
      <thead>
      <tr>
        <th>Time</th>
        <th v-if="showDevice">Device</th>
        <th>Type</th>
        <th>Portion</th>
        <th>Status</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="ev in events" :key="ev.id">
        <td class="td-time">
          {{ timeFormat === 'relative' ? relativeTime(ev.createdAt) : formatDateTime(ev.createdAt) }}
        </td>
        <td v-if="showDevice" class="td-device">{{ ev.deviceName ?? ev.deviceId }}</td>
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
</template>

<style scoped>
.events-wrap { overflow-x: auto; }

.events-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  min-width: 360px;
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

.events-table tr:last-child td { border-bottom: none; }

.td-time { color: var(--text-muted); font-size: 0.8rem; white-space: nowrap; }
.td-device { font-weight: 500; }
.td-portion { font-weight: 600; }

.type-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-weight: 600;
  white-space: nowrap;
}

.type-badge.manual { background: #E8F4FD; color: #2980b9; }
.type-badge.auto { background: #F0FBF5; color: #27ae60; }

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

.status-badge.success { background: #E8F8F0; color: #27ae60; }
.status-badge.fail { background: #FEF0F0; color: #e74c3c; }
</style>
