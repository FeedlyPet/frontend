<script setup lang="ts">
import {ref, onMounted, onBeforeUnmount, computed} from 'vue'
import {notificationsApi} from '../api/notifications.api.ts'
import {useI18n} from '@/shared/composables/use-i18n.ts'
import type {NotificationSettings} from "@/features/notifications/api/notification-settings.ts";

const {t} = useI18n()

const settings = ref<NotificationSettings | null>(null)
const loading = ref(true)
const savingKey = ref<string | null>(null)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  try {
    settings.value = await notificationsApi.getSettings()
  } catch {
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
})

async function toggle(key: keyof NotificationSettings) {
  if (!settings.value) return
  const prev = settings.value[key]
  settings.value[key] = !prev
  savingKey.value = key
  try {
    await notificationsApi.updateSettings({[key]: settings.value[key]})
    showToast(t.value.saved)
  } catch {
    settings.value[key] = prev
    showToast(t.value.failedToSaveSettings)
  } finally {
    savingKey.value = null
  }
}

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2500)
}

const labels = computed((): Record<keyof NotificationSettings, string> => ({
  feedingSuccess: t.value.notifFeedingSuccess,
  feedingFailed: t.value.notifFeedingFailed,
  lowFoodLevel: t.value.notifLowFood,
  deviceStatus: t.value.notifDeviceStatus,
}))
</script>

<template>
  <div class="settings-page">
    <RouterLink to="/notifications" class="back">{{ t.backToNotifications }}</RouterLink>

    <div v-if="loading" class="skeleton" style="height:200px"></div>

    <div class="settings-card" v-else-if="settings">
      <h2 class="card-title">{{ t.notifSettingsTitle }}</h2>
      <div class="settings-list">
        <div v-for="(label, key) in labels" :key="key" class="setting-row">
          <span class="setting-label">{{ label }}</span>
          <button
              class="toggle"
              :class="{ on: settings[key as keyof NotificationSettings] }"
              @click="toggle(key as keyof NotificationSettings)"
              :disabled="savingKey === key"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Teleport>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.back {
  font-size: 0.85rem;
  font-weight: 600;
  color: #A0522D;
  text-decoration: none;
}

.back:hover {
  color: var(--text-primary);
}

.settings-card {
  background: var(--bg-card);
  border-radius: 1.25rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--border);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-label {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.toggle {
  position: relative;
  width: 42px;
  height: 24px;
  border: none;
  border-radius: 999px;
  background: var(--border);
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.toggle.on {
  background: #27ae60;
}

.toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-card);
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle.on .toggle-knob {
  transform: translateX(18px);
}

.toast {
  position: fixed;
  bottom: 5rem;
  left: 50%;
  transform: translateX(-50%);
  background: #2C1208;
  color: #F5EDE0;
  padding: 0.6rem 1.25rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  z-index: 200;
  animation: fadein 0.2s;
}

@keyframes fadein {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
