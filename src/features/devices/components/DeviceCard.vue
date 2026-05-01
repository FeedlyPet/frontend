<script setup lang="ts">
import {RouterLink} from 'vue-router'
import {relativeTime, foodLevelColor, speciesIcon} from '@/shared/utils/formatters.ts'
import type {Device} from '@/features/devices/api/device.ts'
import type {FoodLevel} from '@/features/devices/api/food-level.ts'

defineProps<{
  device: Device
  foodLevel: FoodLevel | null | undefined
}>()

const emit = defineEmits<{
  feed: [device: Device]
}>()
</script>

<template>
  <div class="device-card">
    <div class="device-card-top">
      <div class="device-status-row">
        <span class="status-dot" :class="device.isOnline ? 'online' : 'offline'"></span>
        <span class="status-label" :class="device.isOnline ? 'online' : 'offline'">
          {{ device.isOnline ? 'Online' : 'Offline' }}
        </span>
      </div>
      <RouterLink :to="`/devices/${device.id}`" class="details-link">Details →</RouterLink>
    </div>

    <div class="device-name">{{ device.name }}</div>
    <div v-if="device.location" class="device-location">📍 {{ device.location }}</div>

    <div v-if="device.pet" class="device-pet">
      {{ speciesIcon[device.pet.species] ?? '🐾' }} {{ device.pet.name }}
    </div>
    <div v-else class="device-pet no-pet">No pet linked</div>

    <div class="food-section">
      <div class="food-bar-wrap">
        <div class="food-bar-track">
          <div
              class="food-bar-fill"
              :style="{
              width: (foodLevel?.level ?? 0) + '%',
              background: foodLevelColor(foodLevel?.level ?? 0)
            }"
          ></div>
        </div>
        <span class="food-pct" :class="{ low: (foodLevel?.level ?? 100) < 20 }">
          <span v-if="(foodLevel?.level ?? 100) < 20">⚠️ </span>
          {{ foodLevel ? foodLevel.level + '%' : '—' }}
        </span>
      </div>
      <div v-if="device.lastSeen" class="last-seen">Last seen {{ relativeTime(device.lastSeen) }}</div>
    </div>

    <button
        class="btn-feed"
        :disabled="!device.isOnline"
        :title="device.isOnline ? '' : 'Device is offline'"
        @click="emit('feed', device)"
    >
      {{ device.isOnline ? 'Feed now' : 'Offline' }}
    </button>
  </div>
</template>

<style scoped>
.device-card {
  background: var(--bg-card);
  border-radius: 1.25rem;
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  transition: box-shadow 0.2s;
}

.device-card:hover {
  box-shadow: var(--shadow-md);
}

.device-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-status-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online { background: #27ae60; }
.status-dot.offline { background: #aaa; }

.status-label { font-size: 0.78rem; font-weight: 600; }
.status-label.online { color: #27ae60; }
.status-label.offline { color: #aaa; }

.details-link {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
}

.details-link:hover { color: var(--text-primary); }

.device-name {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text-primary);
}

.device-location { font-size: 0.8rem; color: var(--text-muted); }

.device-pet { font-size: 0.8rem; color: var(--text-secondary); font-weight: 500; }
.device-pet.no-pet { color: var(--text-faint); font-weight: 400; }

.food-section { display: flex; flex-direction: column; gap: 0.25rem; }

.food-bar-wrap { display: flex; align-items: center; gap: 0.5rem; }

.food-bar-track {
  flex: 1;
  height: 8px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.food-bar-fill { height: 100%; border-radius: 999px; transition: width 0.4s; }

.food-pct { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); white-space: nowrap; }
.food-pct.low { color: #e74c3c; }

.last-seen { font-size: 0.72rem; color: var(--text-faint); }

.btn-feed {
  margin-top: 0.25rem;
  padding: 0.55rem;
  background: var(--brown-dark);
  color: var(--bg-page);
  border: none;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.btn-feed:hover:not(:disabled) { background: var(--brown-mid); }
.btn-feed:disabled { opacity: 0.4; cursor: not-allowed; background: #aaa; }
</style>
