<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { notificationsApi } from '../api/notificationsApi.ts'
import type { NotificationSettings } from '../api/notificationsApi.ts'

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

onBeforeUnmount(() => { if (toastTimer) clearTimeout(toastTimer) })

async function toggle(key: keyof NotificationSettings) {
  if (!settings.value) return
  const prev = settings.value[key]
  settings.value[key] = !prev
  savingKey.value = key
  try {
    await notificationsApi.updateSettings({ [key]: settings.value[key] })
    showToast('Saved')
  } catch {
    settings.value[key] = prev
    showToast('Failed to save')
  } finally {
    savingKey.value = null
  }
}

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2500)
}

const labels: Record<keyof NotificationSettings, string> = {
  feedingSuccess: 'Notify on successful feeding',
  feedingFailed: 'Notify on failed feeding',
  lowFoodLevel: 'Warn about low food level',
  deviceStatus: 'Notify on device status change',
}
</script>

<template>
  <div class="settings-page">
    <RouterLink to="/notifications" class="back">← Notifications</RouterLink>

    <div v-if="loading" class="skeleton" style="height:200px"></div>

    <div class="settings-card" v-else-if="settings">
      <h2 class="card-title">Notification preferences</h2>
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
.settings-page { display: flex; flex-direction: column; gap: 1.5rem; }
.back { font-size: 0.85rem; font-weight: 600; color: #A0522D; text-decoration: none; }
.back:hover { color: #2C1208; }
.settings-card { background: #fff; border-radius: 1.25rem; padding: 1.5rem; box-shadow: 0 2px 12px rgba(44,18,8,0.06); display: flex; flex-direction: column; gap: 1rem; }
.card-title { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 1rem; color: #2C1208; }
.settings-list { display: flex; flex-direction: column; gap: 0; }
.setting-row { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 0; border-bottom: 1px solid #F5EDE0; }
.setting-row:last-child { border-bottom: none; }
.setting-label { font-size: 0.9rem; color: #2C1208; }
.toggle {
  position: relative; width: 42px; height: 24px;
  border: none; border-radius: 999px; background: #E0D3C0;
  cursor: pointer; transition: background 0.2s; padding: 0; flex-shrink: 0;
}
.toggle.on { background: #27ae60; }
.toggle:disabled { opacity: 0.5; cursor: not-allowed; }
.toggle-knob {
  position: absolute; top: 3px; left: 3px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle.on .toggle-knob { transform: translateX(18px); }
.toast {
  position: fixed; bottom: 5rem; left: 50%; transform: translateX(-50%);
  background: #2C1208; color: #F5EDE0;
  padding: 0.6rem 1.25rem; border-radius: 999px;
  font-size: 0.875rem; font-weight: 600; font-family: 'Outfit', sans-serif;
  z-index: 200; animation: fadein 0.2s;
}
@keyframes fadein { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
</style>
