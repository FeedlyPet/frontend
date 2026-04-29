<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { devicesApi } from '../api/devicesApi.ts'
import { petsApi } from '../api/petsApi.ts'
import AppSpinner from '../components/AppSpinner.vue'
import { relativeTime, formatDateTime, foodLevelColor, speciesIcon } from '../utils/formatters.ts'
import type { Device, FoodLevel, FeedingEvent, UpdateDeviceDto } from '../api/devicesApi.ts'
import type { Pet } from '../api/petsApi.ts'

const route = useRoute()
const router = useRouter()
const deviceId = route.params.id as string

const device = ref<Device | null>(null)
const foodLevel = ref<FoodLevel | null>(null)
const recentEvents = ref<FeedingEvent[]>([])
const loading = ref(true)
const error = ref('')

const editModal = ref(false)
const editLoading = ref(false)
const editErrors = ref<Record<string, string>>({})
const editForm = ref<UpdateDeviceDto>({ name: '', location: '', petId: undefined })
const pets = ref<Pet[]>([])
const petsLoaded = ref(false)

const confirmDelete = ref(false)
const deleteLoading = ref(false)

const feedModal = ref(false)
const portionSize = ref(100)
const feedLoading = ref(false)
const feedSuccess = ref(false)
let feedCloseTimer: ReturnType<typeof setTimeout> | null = null

const regenConfirm = ref(false)
const regenLoading = ref(false)
const newMqttPassword = ref('')
const showMqttModal = ref(false)
const mqttCopied = ref(false)

onMounted(async () => {
  try {
    const [dev, fl, events] = await Promise.all([
      devicesApi.getOne(deviceId),
      devicesApi.getFoodLevel(deviceId).catch(() => null),
      devicesApi.getEvents(deviceId, { limit: 5 }).catch(() => ({ data: [] as FeedingEvent[] })),
    ])
    device.value = dev
    foodLevel.value = fl
    recentEvents.value = events.data
  } catch {
    error.value = 'Device not found'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (feedCloseTimer) clearTimeout(feedCloseTimer)
})

async function openEdit() {
  if (!device.value) return
  editForm.value = { name: device.value.name, location: device.value.location ?? '', petId: device.value.petId }
  editErrors.value = {}
  editModal.value = true
  if (!petsLoaded.value) {
    try { const res = await petsApi.getAll({ limit: 100 }); pets.value = res.data; petsLoaded.value = true } catch { }
  }
}

async function submitEdit() {
  editErrors.value = {}
  if (!editForm.value.name) { editErrors.value.name = 'Name is required'; return }
  editLoading.value = true
  try {
    const dto: UpdateDeviceDto = {
      name: editForm.value.name,
      location: editForm.value.location || undefined,
      petId: editForm.value.petId ?? null,
    }
    const updated = await devicesApi.update(deviceId, dto)
    device.value = updated
    editModal.value = false
  } catch (e: unknown) {
    editErrors.value.general = (e as any)?.response?.data?.message ?? 'Failed to save'
  } finally {
    editLoading.value = false
  }
}

async function doDelete() {
  deleteLoading.value = true
  try {
    await devicesApi.remove(deviceId)
    router.push('/devices')
  } catch {
  } finally {
    deleteLoading.value = false
  }
}

async function confirmFeed() {
  feedLoading.value = true
  try {
    await devicesApi.manualFeed(deviceId, portionSize.value)
    feedSuccess.value = true
    feedCloseTimer = setTimeout(() => { feedModal.value = false; feedSuccess.value = false }, 1500)
    const events = await devicesApi.getEvents(deviceId, { limit: 5 }).catch(() => ({ data: [] as FeedingEvent[] }))
    recentEvents.value = events.data
  } catch {
  } finally {
    feedLoading.value = false
  }
}

async function regeneratePassword() {
  regenLoading.value = true
  try {
    const res = await devicesApi.regeneratePassword(deviceId)
    newMqttPassword.value = res.mqttPassword
    regenConfirm.value = false
    showMqttModal.value = true
  } catch {
  } finally {
    regenLoading.value = false
  }
}

function copyMqtt() {
  navigator.clipboard.writeText(newMqttPassword.value)
  mqttCopied.value = true
  setTimeout(() => { mqttCopied.value = false }, 2000)
}

const portionsLeft = computed(() => {
  if (!foodLevel.value) return null
  return Math.floor((foodLevel.value.level / 100) * 5000 / 100)
})
</script>

<template>
  <div class="detail-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-wrap">
      <AppSpinner class="spinner-lg" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-wrap">
      <p>{{ error }}</p>
      <RouterLink to="/devices" class="btn-back">← Back to devices</RouterLink>
    </div>

    <template v-else-if="device">
      <!-- Breadcrumb -->
      <RouterLink to="/devices" class="breadcrumb">← Devices</RouterLink>

      <!-- Info panel -->
      <div class="info-card">
        <div class="info-card-header">
          <div>
            <h2 class="device-title">{{ device.name }}</h2>
            <div class="device-meta-row">
              <span class="status-dot" :class="device.isOnline ? 'online' : 'offline'"></span>
              <span class="status-label" :class="device.isOnline ? 'online' : 'offline'">
                {{ device.isOnline ? 'Online' : 'Offline' }}
              </span>
              <span v-if="device.location" class="meta-sep">·</span>
              <span v-if="device.location" class="meta-text">📍 {{ device.location }}</span>
              <span class="meta-sep">·</span>
              <span class="meta-text device-id">ID: {{ device.deviceId }}</span>
            </div>
            <div v-if="device.pet" class="linked-pet">
              {{ speciesIcon[device.pet.species] ?? '🐾' }} {{ device.pet.name }}
            </div>
            <div v-else class="linked-pet no-pet">No pet linked</div>
            <div v-if="device.lastSeen" class="last-seen">Last seen {{ relativeTime(device.lastSeen) }}</div>
          </div>
          <div class="header-actions">
            <button class="btn-edit" @click="openEdit">Edit</button>
            <button class="btn-delete" @click="confirmDelete = true">Delete</button>
          </div>
        </div>
      </div>

      <!-- Food level -->
      <div class="section-card">
        <h3 class="section-title">Food level</h3>
        <div v-if="!foodLevel" class="no-data">No data available</div>
        <template v-else>
          <div class="food-level-big">
            <div class="food-bar-track-big">
              <div
                class="food-bar-fill-big"
                :style="{ width: foodLevel.level + '%', background: foodLevelColor(foodLevel.level) }"
              ></div>
            </div>
            <div class="food-level-info">
              <span class="food-pct-big" :class="{ low: foodLevel.level < 20 }">
                <span v-if="foodLevel.level < 20">⚠️ </span>{{ foodLevel.level }}%
              </span>
              <span v-if="portionsLeft !== null" class="portions-left">~{{ portionsLeft }} portions left</span>
            </div>
            <p class="food-measured">Measured {{ relativeTime(foodLevel.measuredAt) }}</p>
          </div>
        </template>
      </div>

      <!-- Manual feed -->
      <div class="section-card">
        <h3 class="section-title">Manual feeding</h3>
        <p v-if="!device.isOnline" class="offline-note">Device is offline — manual feeding unavailable</p>
        <button v-else class="btn-feed-big" @click="feedModal = true; feedSuccess = false; portionSize = 100">
          🍽️ Feed now
        </button>
      </div>

      <!-- Schedules preview -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">Schedules</h3>
          <RouterLink :to="`/devices/${device.id}/schedules`" class="view-all">Manage →</RouterLink>
        </div>
        <p class="schedule-hint">Set up automatic feeding schedules for this device.</p>
      </div>

      <!-- Recent events -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">Recent feedings</h3>
          <RouterLink :to="`/devices/${device.id}/events`" class="view-all">Full history →</RouterLink>
        </div>
        <div v-if="recentEvents.length === 0" class="no-data">No feeding events yet</div>
        <div v-else class="events-wrap">
          <table class="events-table">
            <thead>
              <tr><th>Time</th><th>Type</th><th>Portion</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr v-for="ev in recentEvents" :key="ev.id">
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
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MQTT settings -->
      <div class="section-card">
        <h3 class="section-title">MQTT settings</h3>
        <p class="mqtt-note">Regenerating the password will disconnect the device until it's reconfigured.</p>
        <button class="btn-regen" @click="regenConfirm = true">🔄 Regenerate MQTT password</button>
      </div>
    </template>
  </div>

  <!-- Feed Modal -->
  <Teleport to="body">
    <div v-if="feedModal" class="modal-backdrop" @click.self="feedModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Feed now</h3>
          <button class="modal-close" @click="feedModal = false">✕</button>
        </div>
        <div v-if="feedSuccess" class="feed-success">
          <span class="success-icon">✅</span><p>Command sent!</p>
        </div>
        <template v-else>
          <div class="portion-field">
            <label>Portion size: <strong>{{ portionSize }}g</strong></label>
            <input type="range" v-model.number="portionSize" min="10" max="500" step="10" class="slider" />
            <div class="slider-labels"><span>10g</span><span>500g</span></div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="feedModal = false">Cancel</button>
            <button class="btn-confirm" :disabled="feedLoading" @click="confirmFeed">
              <AppSpinner v-if="feedLoading" />
              {{ feedLoading ? 'Sending...' : 'Confirm' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>

  <!-- Edit Modal -->
  <Teleport to="body">
    <div v-if="editModal" class="modal-backdrop" @click.self="editModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Edit device</h3>
          <button class="modal-close" @click="editModal = false">✕</button>
        </div>
        <div v-if="editErrors.general" class="form-error-banner">{{ editErrors.general }}</div>
        <form @submit.prevent="submitEdit" class="modal-form">
          <div class="field">
            <label>Name *</label>
            <input v-model="editForm.name" type="text" :class="{ error: editErrors.name }" />
            <p v-if="editErrors.name" class="field-error">{{ editErrors.name }}</p>
          </div>
          <div class="field">
            <label>Location</label>
            <input v-model="editForm.location" type="text" placeholder="Kitchen" />
          </div>
          <div class="field">
            <label>Linked pet</label>
            <select v-model="editForm.petId" class="select-field">
              <option :value="null">— Unlink pet —</option>
              <option v-for="pet in pets" :key="pet.id" :value="pet.id">
                {{ speciesIcon[pet.species] ?? '🐾' }} {{ pet.name }}
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="editModal = false">Cancel</button>
            <button type="submit" class="btn-confirm" :disabled="editLoading">
              <AppSpinner v-if="editLoading" />
              {{ editLoading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- Confirm Delete -->
  <Teleport to="body">
    <div v-if="confirmDelete" class="modal-backdrop" @click.self="confirmDelete = false">
      <div class="modal confirm-modal">
        <div class="confirm-icon">⚠️</div>
        <h3 class="confirm-title">Delete "{{ device?.name }}"?</h3>
        <p class="confirm-text">All schedules and events for this device will also be deleted. This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="confirmDelete = false">Cancel</button>
          <button class="btn-danger" :disabled="deleteLoading" @click="doDelete">
            <AppSpinner v-if="deleteLoading" />
            {{ deleteLoading ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Regen confirm -->
  <Teleport to="body">
    <div v-if="regenConfirm" class="modal-backdrop" @click.self="regenConfirm = false">
      <div class="modal confirm-modal">
        <div class="confirm-icon">🔑</div>
        <h3 class="confirm-title">Regenerate MQTT password?</h3>
        <p class="confirm-text">The old password will stop working. You'll need to reconfigure the device with the new password.</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="regenConfirm = false">Cancel</button>
          <button class="btn-danger" :disabled="regenLoading" @click="regeneratePassword">
            <AppSpinner v-if="regenLoading" />
            {{ regenLoading ? 'Regenerating...' : 'Regenerate' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- New MQTT password -->
  <Teleport to="body">
    <div v-if="showMqttModal" class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <h3>New MQTT password</h3>
        </div>
        <div class="mqtt-warning">
          <span>⚠️</span>
          <p>Save this password — it won't be shown again!</p>
        </div>
        <div class="mqtt-password-block">
          <code class="mqtt-password">{{ newMqttPassword }}</code>
          <button class="btn-copy" @click="copyMqtt">{{ mqttCopied ? 'Copied ✓' : 'Copy' }}</button>
        </div>
        <button class="btn-confirm" @click="showMqttModal = false">Done</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.detail-page { display: flex; flex-direction: column; gap: 1.25rem; }

.loading-wrap { display: flex; justify-content: center; padding: 3rem; }
.spinner-lg { width: 2rem !important; height: 2rem !important; color: #A0522D; }

.error-wrap { text-align: center; padding: 2rem; color: #c0392b; display: flex; flex-direction: column; gap: 1rem; align-items: center; }

.breadcrumb { font-size: 0.85rem; font-weight: 600; color: #A0522D; text-decoration: none; }
.breadcrumb:hover { color: #2C1208; }

.btn-back { padding: 0.5rem 1rem; background: #F5EDE0; border: 1.5px solid #E0D3C0; border-radius: 0.75rem; font-size: 0.875rem; color: #7B3A18; text-decoration: none; font-family: 'Outfit', sans-serif; font-weight: 600; }

.info-card { background: #fff; border-radius: 1.25rem; padding: 1.5rem; box-shadow: 0 2px 12px rgba(44,18,8,0.06); }
.info-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.device-title { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 1.4rem; color: #2C1208; margin-bottom: 0.4rem; }
.device-meta-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.35rem; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-dot.online { background: #27ae60; }
.status-dot.offline { background: #aaa; }
.status-label { font-size: 0.8rem; font-weight: 600; }
.status-label.online { color: #27ae60; }
.status-label.offline { color: #aaa; }
.meta-sep { color: #C4875A; opacity: 0.5; }
.meta-text { font-size: 0.8rem; color: #A0522D; }
.device-id { font-family: monospace; font-size: 0.75rem; }
.linked-pet { font-size: 0.875rem; color: #7B3A18; font-weight: 500; margin-top: 0.25rem; }
.linked-pet.no-pet { color: #C4875A; font-weight: 400; }
.last-seen { font-size: 0.72rem; color: #C4875A; margin-top: 0.2rem; }
.header-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
.btn-edit { padding: 0.5rem 1rem; background: #F5EDE0; border: 1.5px solid #E0D3C0; border-radius: 0.75rem; font-size: 0.85rem; font-weight: 600; color: #7B3A18; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.2s; }
.btn-edit:hover { border-color: #A0522D; color: #A0522D; }
.btn-delete { padding: 0.5rem 1rem; background: #FEF0F0; border: 1.5px solid #f5c6c6; border-radius: 0.75rem; font-size: 0.85rem; font-weight: 600; color: #e74c3c; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.2s; }
.btn-delete:hover { background: #e74c3c; color: #fff; border-color: #e74c3c; }

.section-card { background: #fff; border-radius: 1.25rem; padding: 1.5rem; box-shadow: 0 2px 12px rgba(44,18,8,0.06); display: flex; flex-direction: column; gap: 0.75rem; }
.section-header { display: flex; align-items: center; justify-content: space-between; }
.section-title { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 1rem; color: #2C1208; }
.view-all { font-size: 0.8rem; font-weight: 600; color: #A0522D; text-decoration: none; }
.view-all:hover { color: #2C1208; }
.no-data { font-size: 0.875rem; color: #C4875A; }

.food-level-big { display: flex; flex-direction: column; gap: 0.5rem; }
.food-bar-track-big { height: 16px; background: #E0D3C0; border-radius: 999px; overflow: hidden; }
.food-bar-fill-big { height: 100%; border-radius: 999px; transition: width 0.5s; }
.food-level-info { display: flex; align-items: center; justify-content: space-between; }
.food-pct-big { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 1.5rem; color: #2C1208; }
.food-pct-big.low { color: #e74c3c; }
.portions-left { font-size: 0.8rem; color: #A0522D; }
.food-measured { font-size: 0.75rem; color: #C4875A; }

.offline-note { font-size: 0.875rem; color: #C4875A; }
.btn-feed-big {
  padding: 0.75rem 1.5rem;
  background: #2C1208; color: #F5EDE0;
  border: none; border-radius: 0.75rem;
  font-size: 1rem; font-weight: 600; font-family: 'Outfit', sans-serif;
  cursor: pointer; transition: background 0.2s; align-self: flex-start;
}
.btn-feed-big:hover { background: #7B3A18; }

.schedule-hint { font-size: 0.875rem; color: #A0522D; }

.events-wrap { overflow-x: auto; }
.events-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; min-width: 360px; }
.events-table th { text-align: left; padding: 0 0.5rem 0.5rem; font-size: 0.75rem; color: #A0522D; font-weight: 600; border-bottom: 1px solid #E0D3C0; }
.events-table td { padding: 0.5rem; border-bottom: 1px solid #F5EDE0; color: #2C1208; }
.events-table tr:last-child td { border-bottom: none; }
.td-time { color: #A0522D; font-size: 0.8rem; white-space: nowrap; }
.td-portion { font-weight: 600; }
.type-badge { font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 999px; font-weight: 600; white-space: nowrap; }
.type-badge.manual { background: #E8F4FD; color: #2980b9; }
.type-badge.auto { background: #F0FBF5; color: #27ae60; }
.status-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; font-weight: 700; font-size: 0.75rem; }
.status-badge.success { background: #E8F8F0; color: #27ae60; }
.status-badge.fail { background: #FEF0F0; color: #e74c3c; }

.mqtt-note { font-size: 0.875rem; color: #A0522D; }
.btn-regen { padding: 0.6rem 1.2rem; background: #F5EDE0; border: 1.5px solid #E0D3C0; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 600; color: #7B3A18; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all 0.2s; align-self: flex-start; }
.btn-regen:hover { border-color: #A0522D; color: #A0522D; }
</style>
