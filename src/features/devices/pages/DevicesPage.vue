<script setup lang="ts">
import {ref, watch, onMounted, onBeforeUnmount, computed} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import axios from 'axios'
import {devicesApi} from '../api/devices.api.ts'
import {petsApi} from '@/features/pets/api/pets.api.ts'
import AppSpinner from '@/shared/components/AppSpinner.vue'
import {speciesIcon} from '@/shared/utils/formatters.ts'

import {useToast} from '@/shared/composables/use-toast.ts'
import {useI18n} from '@/shared/composables/use-i18n.ts'
import {useFeedModal} from '../composables/use-feed-modal.ts'
import {useDebounce} from '@/shared/composables/use-debounce.ts'
import {extractErrorMessage} from '@/shared/utils/error-handler.ts'
import DeviceCard from '../components/DeviceCard.vue'
import FeedModal from '../components/FeedModal.vue'
import MqttPasswordModal from '../components/MqttPasswordModal.vue'
import type {Device} from "@/features/devices/api/device.ts";
import type {FoodLevel} from "@/features/devices/api/food-level.ts";
import type {CreateDeviceDto} from "@/features/devices/api/create-device.dto.ts";
import type {Pet} from "@/features/pets/api/pet.ts";
import {useSocket} from '@/shared/composables/use-socket.ts'

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

const router = useRouter()
const route = useRoute()

const devices = ref<Device[]>([])
const foodLevels = ref<Record<string, FoodLevel | null>>({})
const total = ref(0)
const loading = ref(true)
const page = ref(Number(route.query.page) || 1)
const search = ref((route.query.search as string) || '')
const limit = 10

const registerModal = ref(false)
const registerLoading = ref(false)
const registerErrors = ref<Record<string, string>>({})
const mqttPassword = ref('')
const showMqttModal = ref(false)
const pets = ref<Pet[]>([])
const petsLoaded = ref(false)
const registerForm = ref<CreateDeviceDto>({deviceId: '', name: '', location: '', petId: undefined})

const totalPages = computed(() => Math.ceil(total.value / limit))

const socket = useSocket()

function onDeviceStatus(data: { deviceId: string; isOnline: boolean; lastSeen: string }) {
  const device = devices.value.find(d => d.id === data.deviceId)
  if (device) {
    device.isOnline = data.isOnline
    device.lastSeen = data.lastSeen
  }
}

async function fetchDevices() {
  loading.value = true
  try {
    const res = await devicesApi.getAll({page: page.value, limit, search: search.value || undefined})
    devices.value = res.data
    total.value = res.meta.total

    const levels = await Promise.all(
        res.data.map(d => devicesApi.getFoodLevel(d.id).then(fl => ({id: d.id, fl})).catch(() => ({
          id: d.id,
          fl: null
        })))
    )
    for (const {id, fl} of levels) foodLevels.value[id] = fl
  } catch {
    toast.error(t.value.failedToLoadDevices)
  } finally {
    loading.value = false
  }
}

function syncUrl() {
  router.replace({query: {...(page.value > 1 ? {page: page.value} : {}), ...(search.value ? {search: search.value} : {})}})
}

const debouncedSearch = useDebounce(() => {
  page.value = 1;
  syncUrl();
  fetchDevices()
})

watch([page], () => {
  syncUrl();
  fetchDevices()
})
watch(search, (val, old) => {
  if (val !== old) debouncedSearch()
})

onMounted(() => {
  fetchDevices()
  socket.on('device:status', onDeviceStatus)
})

onBeforeUnmount(() => {
  socket.off('device:status', onDeviceStatus)
})

async function openRegister() {
  registerForm.value = {deviceId: '', name: '', location: '', petId: undefined}
  registerErrors.value = {}
  registerModal.value = true
  if (!petsLoaded.value) {
    try {
      const res = await petsApi.getAll({limit: 100});
      pets.value = res.data;
      petsLoaded.value = true
    } catch {
    }
  }
}

function closeRegister() {
  registerModal.value = false
}

async function submitRegister() {
  registerErrors.value = {}
  if (!registerForm.value.deviceId) registerErrors.value.deviceId = t.value.deviceIdRequired
  if (!registerForm.value.name) registerErrors.value.name = t.value.nameRequired
  if (Object.keys(registerErrors.value).length) return

  registerLoading.value = true
  try {
    const dto: CreateDeviceDto = {
      deviceId: registerForm.value.deviceId,
      name: registerForm.value.name,
      location: registerForm.value.location || undefined,
      petId: registerForm.value.petId || undefined,
    }
    const result = await devicesApi.create(dto)
    mqttPassword.value = result.mqttPassword
    closeRegister()
    showMqttModal.value = true
    toast.success(t.value.deviceRegistered)
    fetchDevices()
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && e.response?.status === 409) registerErrors.value.deviceId = t.value.deviceAlreadyRegistered
    else registerErrors.value.general = extractErrorMessage(e, t.value.registrationFailed)
  } finally {
    registerLoading.value = false
  }
}


</script>

<template>
  <div class="devices-page">
    <div class="toolbar">
      <div class="search-wrap">
        <svg class="search-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
        </svg>
        <input v-model="search" type="text" :placeholder="t.searchDevices" class="search-input"/>
      </div>
      <button class="btn-add" @click="openRegister">+ {{ t.addDevice }}</button>
    </div>

    <div v-if="loading" class="devices-grid">
      <div v-for="i in 4" :key="i" class="skeleton" style="height:200px"></div>
    </div>

    <div v-else-if="devices.length === 0" class="empty-state">
      <div class="empty-icon">📡</div>
      <h3>{{ t.noDevices }}</h3>
      <p v-if="search">{{ t.noResults }} "{{ search }}"</p>
      <p v-else>{{ t.registerFirstFeeder }}</p>
      <button class="btn-add" @click="openRegister">{{ t.addDevice }}</button>
    </div>

    <div v-else class="devices-grid">
      <DeviceCard
          v-for="device in devices"
          :key="device.id"
          :device="device"
          :food-level="foodLevels[device.id]"
          @feed="openFeedModal"
      />
    </div>

    <div v-if="!loading && totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="page--">←</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="page >= totalPages" @click="page++">→</button>
    </div>
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
    <div v-if="registerModal" class="modal-backdrop" @click.self="closeRegister">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ t.registerDevice }}</h3>
          <button class="modal-close" @click="closeRegister">✕</button>
        </div>
        <div v-if="registerErrors.general" class="form-error-banner">{{ registerErrors.general }}</div>
        <form @submit.prevent="submitRegister" class="modal-form">
          <div class="field">
            <label>{{ t.hardwareId }}</label>
            <input v-model="registerForm.deviceId" type="text" placeholder="hw-uuid-123"
                   :class="{ error: registerErrors.deviceId }"/>
            <p v-if="registerErrors.deviceId" class="field-error">{{ registerErrors.deviceId }}</p>
            <p class="field-hint">{{ t.hardwareIdHint }}</p>
          </div>
          <div class="field">
            <label>{{ t.name }} *</label>
            <input v-model="registerForm.name" type="text" maxlength="100" placeholder="Kitchen feeder"
                   :class="{ error: registerErrors.name }"/>
            <p v-if="registerErrors.name" class="field-error">{{ registerErrors.name }}</p>
          </div>
          <div class="field">
            <label>{{ t.location }}</label>
            <input v-model="registerForm.location" type="text" placeholder="Kitchen"/>
          </div>
          <div class="field">
            <label>{{ t.linkToPet }}</label>
            <select v-model="registerForm.petId" class="select-field">
              <option :value="undefined">{{ t.noPet }}</option>
              <option v-for="pet in pets" :key="pet.id" :value="pet.id">
                {{ speciesIcon[pet.species] ?? '🐾' }} {{ pet.name }}
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeRegister">{{ t.cancel }}</button>
            <button type="submit" class="btn-confirm" :disabled="registerLoading">
              <AppSpinner v-if="registerLoading"/>
              {{ registerLoading ? t.registering : t.register }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <MqttPasswordModal
      v-if="showMqttModal"
      :password="mqttPassword"
      :title="t.deviceRegisteredTitle"
      @close="showMqttModal = false"
  />
</template>

<style scoped>
.devices-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.search-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: var(--text-faint);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.6rem 0.9rem 0.6rem 2.25rem;
  border: 1.5px solid var(--border);
  border-radius: 0.75rem;
  font-size: 0.9rem;
  font-family: 'Outfit', sans-serif;
  background: var(--bg-card);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--text-muted);
}

.search-input::placeholder {
  color: var(--text-faint);
  opacity: 0.7;
}

.btn-add {
  padding: 0.6rem 1.1rem;
  background: var(--brown-dark);
  color: var(--bg-page);
  border: none;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-add:hover {
  background: var(--brown-mid);
}

@media (max-width: 480px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-add {
    width: 100%;
    text-align: center;
  }
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

.empty-state .btn-add {
  margin-top: 0.5rem;
}

.devices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

@media (max-width: 480px) {
  .devices-grid {
    grid-template-columns: 1fr;
  }
}

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

.status-dot.online {
  background: #27ae60;
}

.status-dot.offline {
  background: #aaa;
}

.status-label {
  font-size: 0.78rem;
  font-weight: 600;
}

.status-label.online {
  color: #27ae60;
}

.status-label.offline {
  color: #aaa;
}

.details-link {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
}

.details-link:hover {
  color: var(--text-primary);
}

.device-name {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text-primary);
}

.device-location {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.device-pet {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.device-pet.no-pet {
  color: var(--text-faint);
  font-weight: 400;
}

.food-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.food-bar-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.food-bar-track {
  flex: 1;
  height: 8px;
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
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.food-pct.low {
  color: #e74c3c;
}

.last-seen {
  font-size: 0.72rem;
  color: var(--text-faint);
}

.btn-feed {
  margin-top: 0.25rem;
  padding: 0.55rem;
  background: var(--brown-light);
  color: #fdf6ec;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.btn-feed:hover:not(:disabled) {
  background: var(--brown-mid);
}

.btn-feed:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #aaa;
}
</style>
