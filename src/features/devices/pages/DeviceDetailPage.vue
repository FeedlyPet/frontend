<script setup lang="ts">
import {ref, onMounted, onBeforeUnmount, computed} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {devicesApi} from '../api/devices.api.ts'
import {petsApi} from '@/features/pets/api/pets.api.ts'
import AppSpinner from '@/shared/components/AppSpinner.vue'
import {relativeTime, foodLevelColor, speciesIcon} from '@/shared/utils/formatters.ts'
import {useToast} from '@/shared/composables/use-toast.ts'
import {useI18n} from '@/shared/composables/use-i18n.ts'
import {extractErrorMessage} from '@/shared/utils/error-handler.ts'
import FeedModal from '../components/FeedModal.vue'
import {useFeedModal} from '../composables/use-feed-modal.ts'
import {useSocket} from '@/shared/composables/use-socket.ts'
import MqttPasswordModal from '../components/MqttPasswordModal.vue'
import FeedingEventsTable from '../components/FeedingEventsTable.vue'
import type {Device} from "@/features/devices/api/device.ts";
import type {FoodLevel} from "@/features/devices/api/food-level.ts";
import type {FeedingEvent} from "@/features/devices/api/feeding-event.ts";
import type {UpdateDeviceDto} from "@/features/devices/api/update-device.dto.ts";
import type {Pet} from "@/features/pets/api/pet.ts";

const toast = useToast()
const {t} = useI18n()

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
const editForm = ref<UpdateDeviceDto>({name: '', location: '', petId: undefined})
const pets = ref<Pet[]>([])
const petsLoaded = ref(false)

const confirmDelete = ref(false)
const deleteLoading = ref(false)

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
  confirmFeed,
} = useFeedModal()

const regenConfirm = ref(false)
const regenLoading = ref(false)
const newMqttPassword = ref('')
const showMqttModal = ref(false)

const socket = useSocket()

function onFoodLevel(data: { deviceId: string; level: number }) {
  if (device.value && data.deviceId === device.value.id) {
    foodLevel.value = foodLevel.value
      ? { ...foodLevel.value, level: data.level }
      : { level: data.level, measuredAt: new Date().toISOString() }
  }
}

onMounted(async () => {
  try {
    const [dev, fl, events] = await Promise.all([
      devicesApi.getOne(deviceId),
      devicesApi.getFoodLevel(deviceId).catch(() => null),
      devicesApi.getEvents(deviceId, {limit: 5}).catch(() => ({data: [] as FeedingEvent[]})),
    ])
    device.value = dev
    foodLevel.value = fl
    recentEvents.value = events.data
  } catch {
    error.value = t.value.deviceNotFound
  } finally {
    loading.value = false
  }

  socket.on('food:level', onFoodLevel)
})

onBeforeUnmount(() => {
  socket.off('food:level', onFoodLevel)
})


async function openEdit() {
  if (!device.value) return
  editForm.value = {name: device.value.name, location: device.value.location ?? '', petId: device.value.petId}
  editErrors.value = {}
  editModal.value = true
  if (!petsLoaded.value) {
    try {
      const res = await petsApi.getAll({limit: 100});
      pets.value = res.data;
      petsLoaded.value = true
    } catch {
    }
  }
}

async function submitEdit() {
  editErrors.value = {}
  if (!editForm.value.name) {
    editErrors.value.name = t.value.nameRequired;
    return
  }
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
    editErrors.value.general = extractErrorMessage(e, t.value.failedToSave)
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
    toast.error(t.value.failedToDeleteDevice)
  } finally {
    deleteLoading.value = false
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
    toast.error(t.value.failedToRegenMqtt)
  } finally {
    regenLoading.value = false
  }
}

const portionsLeft = computed(() => {
  if (!foodLevel.value) return null
  return Math.floor((foodLevel.value.level / 100) * 5000 / 100)
})
</script>

<template>
  <div class="detail-page">
    <div v-if="loading" class="loading-wrap">
      <AppSpinner class="spinner-lg"/>
    </div>

    <div v-else-if="error" class="error-wrap">
      <p>{{ error }}</p>
      <RouterLink to="/devices" class="btn-back">{{ t.backToDevices }}</RouterLink>
    </div>

    <template v-else-if="device">
      <RouterLink to="/devices" class="breadcrumb">{{ t.devicesBack }}</RouterLink>

      <div class="info-card">
        <div class="info-card-header">
          <div>
            <h2 class="device-title">{{ device.name }}</h2>
            <div class="device-meta-row">
              <span class="status-dot" :class="device.isOnline ? 'online' : 'offline'"></span>
              <span class="status-label" :class="device.isOnline ? 'online' : 'offline'">
                {{ device.isOnline ? t.online : t.offline }}
              </span>
              <span v-if="device.location" class="meta-sep">·</span>
              <span v-if="device.location" class="meta-text">📍 {{ device.location }}</span>
              <span class="meta-sep">·</span>
              <span class="meta-text device-id">ID: {{ device.deviceId }}</span>
            </div>
            <div v-if="device.pet" class="linked-pet">
              {{ speciesIcon[device.pet.species] ?? '🐾' }} {{ device.pet.name }}
            </div>
            <div v-else class="linked-pet no-pet">{{ t.noPetLinked }}</div>
            <div v-if="device.lastSeen" class="last-seen">{{ t.lastSeen }} {{ relativeTime(device.lastSeen) }}</div>
          </div>
          <div class="header-actions">
            <button class="btn-edit" @click="openEdit">{{ t.edit }}</button>
            <button class="btn-delete" @click="confirmDelete = true">{{ t.delete }}</button>
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">{{ t.foodLevel }}</h3>
        <div v-if="!foodLevel" class="no-data">{{ t.noDataAvailable }}</div>
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
              <span v-if="portionsLeft !== null" class="portions-left">~{{ portionsLeft }} {{ t.portionsLeft }}</span>
            </div>
            <p class="food-measured">{{ t.measuredAt }} {{ relativeTime(foodLevel.measuredAt) }}</p>
          </div>
        </template>
      </div>

      <div class="section-card">
        <h3 class="section-title">{{ t.manualFeeding }}</h3>
        <p v-if="!device.isOnline" class="offline-note">{{ t.deviceOffline }}</p>
        <button v-else class="btn-feed-big" @click="openFeedModal(device)">
          🍽️ {{ t.feedNow }}
        </button>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">{{ t.schedules }}</h3>
          <RouterLink :to="`/devices/${device.id}/schedules`" class="view-all">{{ t.manage }}</RouterLink>
        </div>
        <p class="schedule-hint">{{ t.schedulesHint }}</p>
      </div>

      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">{{ t.recentFeedings }}</h3>
          <RouterLink :to="`/devices/${device.id}/events`" class="view-all">{{ t.fullHistory }}</RouterLink>
        </div>
        <div v-if="recentEvents.length === 0" class="no-data">{{ t.noFeedingEvents }}</div>
        <FeedingEventsTable v-else :events="recentEvents"/>
      </div>

      <div class="section-card">
        <h3 class="section-title">{{ t.mqttSettings }}</h3>
        <p class="mqtt-note">{{ t.mqttNote }}</p>
        <button class="btn-regen" @click="regenConfirm = true">🔄 {{ t.regenerateMqtt }}</button>
      </div>
    </template>
  </div>

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

  <Teleport to="body">
    <div v-if="editModal" class="modal-backdrop" @click.self="editModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ t.editDevice }}</h3>
          <button class="modal-close" @click="editModal = false">✕</button>
        </div>
        <div v-if="editErrors.general" class="form-error-banner">{{ editErrors.general }}</div>
        <form @submit.prevent="submitEdit" class="modal-form">
          <div class="field">
            <label>{{ t.name }} *</label>
            <input v-model="editForm.name" type="text" :class="{ error: editErrors.name }"/>
            <p v-if="editErrors.name" class="field-error">{{ editErrors.name }}</p>
          </div>
          <div class="field">
            <label>{{ t.location }}</label>
            <input v-model="editForm.location" type="text" placeholder="Kitchen"/>
          </div>
          <div class="field">
            <label>{{ t.linkedPet }}</label>
            <select v-model="editForm.petId" class="select-field">
              <option :value="null">{{ t.unlinkPet }}</option>
              <option v-for="pet in pets" :key="pet.id" :value="pet.id">
                {{ speciesIcon[pet.species] ?? '🐾' }} {{ pet.name }}
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="editModal = false">{{ t.cancel }}</button>
            <button type="submit" class="btn-confirm" :disabled="editLoading">
              <AppSpinner v-if="editLoading"/>
              {{ editLoading ? t.saving : t.save }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="confirmDelete" class="modal-backdrop" @click.self="confirmDelete = false">
      <div class="modal confirm-modal">
        <div class="confirm-icon">⚠️</div>
        <h3 class="confirm-title">Delete "{{ device?.name }}"?</h3>
        <p class="confirm-text">{{ t.deleteDeviceConfirm }}</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="confirmDelete = false">{{ t.cancel }}</button>
          <button class="btn-danger" :disabled="deleteLoading" @click="doDelete">
            <AppSpinner v-if="deleteLoading"/>
            {{ deleteLoading ? t.deleting : t.delete }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="regenConfirm" class="modal-backdrop" @click.self="regenConfirm = false">
      <div class="modal confirm-modal">
        <div class="confirm-icon">🔑</div>
        <h3 class="confirm-title">{{ t.regenMqttTitle }}</h3>
        <p class="confirm-text">{{ t.regenMqttConfirm }}</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="regenConfirm = false">{{ t.cancel }}</button>
          <button class="btn-danger" :disabled="regenLoading" @click="regeneratePassword">
            <AppSpinner v-if="regenLoading"/>
            {{ regenLoading ? t.regenerating : t.regenerate }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <MqttPasswordModal
      v-if="showMqttModal"
      :password="newMqttPassword"
      :title="t.newMqttPassword"
      @close="showMqttModal = false"
  />
</template>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 3rem;
}

.spinner-lg {
  width: 2rem !important;
  height: 2rem !important;
  color: var(--text-muted);
}

.error-wrap {
  text-align: center;
  padding: 2rem;
  color: #c0392b;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
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

.btn-back {
  padding: 0.5rem 1rem;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  border-radius: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
}

.info-card {
  background: var(--bg-card);
  border-radius: 1.25rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.info-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.device-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.4rem;
  color: var(--text-primary);
  margin-bottom: 0.4rem;
}

.device-meta-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
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

.status-label {
  font-size: 0.8rem;
  font-weight: 600;
}

.status-label.online {
  color: #27ae60;
}

.status-label.offline {
  color: #aaa;
}

.meta-sep {
  color: var(--text-faint);
  opacity: 0.5;
}

.meta-text {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.device-id {
  font-family: monospace;
  font-size: 0.75rem;
}

.linked-pet {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  margin-top: 0.25rem;
}

.linked-pet.no-pet {
  color: var(--text-faint);
  font-weight: 400;
}

.last-seen {
  font-size: 0.72rem;
  color: var(--text-faint);
  margin-top: 0.2rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-edit {
  padding: 0.5rem 1rem;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  border-radius: 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  transition: all 0.2s;
}

.btn-edit:hover {
  border-color: var(--text-muted);
  color: var(--text-muted);
}

.btn-delete {
  padding: 0.5rem 1rem;
  background: #FEF0F0;
  border: 1.5px solid #f5c6c6;
  border-radius: 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #e74c3c;
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #e74c3c;
  color: #fff;
  border-color: #e74c3c;
}

.section-card {
  background: var(--bg-card);
  border-radius: 1.25rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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

.no-data {
  font-size: 0.875rem;
  color: var(--text-faint);
}

.food-level-big {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.food-bar-track-big {
  height: 16px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.food-bar-fill-big {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s;
}

.food-level-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.food-pct-big {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.food-pct-big.low {
  color: #e74c3c;
}

.portions-left {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.food-measured {
  font-size: 0.75rem;
  color: var(--text-faint);
}

.offline-note {
  font-size: 0.875rem;
  color: var(--text-faint);
}

.btn-feed-big {
  padding: 0.75rem 1.5rem;
  background: var(--brown-dark);
  color: var(--bg-page);
  border: none;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  transition: background 0.2s;
  align-self: flex-start;
}

.btn-feed-big:hover {
  background: var(--brown-mid);
}

.schedule-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
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

.mqtt-note {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.btn-regen {
  padding: 0.6rem 1.2rem;
  background: var(--bg-page);
  border: 1.5px solid var(--border);
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  transition: all 0.2s;
  align-self: flex-start;
}

.btn-regen:hover {
  border-color: var(--text-muted);
  color: var(--text-muted);
}

@media (max-width: 480px) {
  .info-card {
    padding: 1rem;
  }
  .section-card {
    padding: 1rem;
  }
  .device-title {
    font-size: 1.2rem;
  }
  .header-actions {
    gap: 0.35rem;
  }
  .btn-edit,
  .btn-delete {
    padding: 0.4rem 0.7rem;
    font-size: 0.78rem;
  }
}
</style>
