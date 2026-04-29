<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { devicesApi } from '../api/devicesApi.ts'
import { petsApi } from '../api/petsApi.ts'
import AppSpinner from '../components/AppSpinner.vue'
import { relativeTime, foodLevelColor, speciesIcon } from '../utils/formatters.ts'
import type { Device, FoodLevel, CreateDeviceDto } from '../api/devicesApi.ts'
import type { Pet } from '../api/petsApi.ts'

const router = useRouter()
const route = useRoute()

const devices = ref<Device[]>([])
const foodLevels = ref<Record<string, FoodLevel | null>>({})
const total = ref(0)
const loading = ref(true)
const page = ref(Number(route.query.page) || 1)
const search = ref((route.query.search as string) || '')
const limit = 10

let searchDebounce: ReturnType<typeof setTimeout>

const feedModal = ref(false)
const feedDevice = ref<Device | null>(null)
const portionSize = ref(100)
const feedLoading = ref(false)
const feedSuccess = ref(false)
let feedCloseTimer: ReturnType<typeof setTimeout> | null = null

const registerModal = ref(false)
const registerLoading = ref(false)
const registerErrors = ref<Record<string, string>>({})
const mqttPassword = ref('')
const showMqttModal = ref(false)
const pets = ref<Pet[]>([])
const petsLoaded = ref(false)
const registerForm = ref<CreateDeviceDto>({ deviceId: '', name: '', location: '', petId: undefined })

const totalPages = computed(() => Math.ceil(total.value / limit))

async function fetchDevices() {
  loading.value = true
  try {
    const res = await devicesApi.getAll({ page: page.value, limit, search: search.value || undefined })
    devices.value = res.data
    total.value = res.total

    const levels = await Promise.all(
      res.data.map(d => devicesApi.getFoodLevel(d.id).then(fl => ({ id: d.id, fl })).catch(() => ({ id: d.id, fl: null })))
    )
    for (const { id, fl } of levels) foodLevels.value[id] = fl
  } catch {
  } finally {
    loading.value = false
  }
}

function syncUrl() {
  router.replace({ query: { ...(page.value > 1 ? { page: page.value } : {}), ...(search.value ? { search: search.value } : {}) } })
}

watch([page], () => { syncUrl(); fetchDevices() })
watch(search, (val, old) => {
  if (val === old) return
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => { page.value = 1; syncUrl(); fetchDevices() }, 300)
})

onMounted(fetchDevices)
onBeforeUnmount(() => {
  clearTimeout(searchDebounce)
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

async function openRegister() {
  registerForm.value = { deviceId: '', name: '', location: '', petId: undefined }
  registerErrors.value = {}
  registerModal.value = true
  if (!petsLoaded.value) {
    try { const res = await petsApi.getAll({ limit: 100 }); pets.value = res.data; petsLoaded.value = true } catch { }
  }
}
function closeRegister() { registerModal.value = false }

async function submitRegister() {
  registerErrors.value = {}
  if (!registerForm.value.deviceId) registerErrors.value.deviceId = 'Device ID is required'
  if (!registerForm.value.name) registerErrors.value.name = 'Name is required'
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
    fetchDevices()
  } catch (e: unknown) {
    const err = e as any
    if (err.response?.status === 409) registerErrors.value.deviceId = 'Device with this ID is already registered'
    else registerErrors.value.general = err.response?.data?.message ?? 'Registration failed'
  } finally {
    registerLoading.value = false
  }
}

const mqttCopied = ref(false)
function copyMqtt() {
  navigator.clipboard.writeText(mqttPassword.value)
  mqttCopied.value = true
  setTimeout(() => { mqttCopied.value = false }, 2000)
}
</script>

<template>
  <div class="devices-page">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-wrap">
        <svg class="search-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
        </svg>
        <input v-model="search" type="text" placeholder="Search devices..." class="search-input" />
      </div>
      <button class="btn-add" @click="openRegister">+ Add device</button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="devices-grid">
      <div v-for="i in 4" :key="i" class="skeleton" style="height:200px"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="devices.length === 0" class="empty-state">
      <div class="empty-icon">📡</div>
      <h3>No devices yet</h3>
      <p v-if="search">No results for "{{ search }}"</p>
      <p v-else>Register your first feeder to get started!</p>
      <button class="btn-add" @click="openRegister">Add device</button>
    </div>

    <!-- Grid -->
    <div v-else class="devices-grid">
      <div v-for="device in devices" :key="device.id" class="device-card">
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

        <!-- Food level -->
        <div class="food-section">
          <div class="food-bar-wrap">
            <div class="food-bar-track">
              <div
                class="food-bar-fill"
                :style="{
                  width: (foodLevels[device.id]?.level ?? 0) + '%',
                  background: foodLevelColor(foodLevels[device.id]?.level ?? 0)
                }"
              ></div>
            </div>
            <span class="food-pct" :class="{ low: (foodLevels[device.id]?.level ?? 100) < 20 }">
              <span v-if="(foodLevels[device.id]?.level ?? 100) < 20">⚠️ </span>
              {{ foodLevels[device.id] ? foodLevels[device.id]!.level + '%' : '—' }}
            </span>
          </div>
          <div v-if="device.lastSeen" class="last-seen">Last seen {{ relativeTime(device.lastSeen) }}</div>
        </div>

        <button
          class="btn-feed"
          :disabled="!device.isOnline"
          :title="device.isOnline ? '' : 'Device is offline'"
          @click="openFeedModal(device)"
        >
          {{ device.isOnline ? 'Feed now' : 'Offline' }}
        </button>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="page--">←</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="page >= totalPages" @click="page++">→</button>
    </div>
  </div>

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

  <!-- Register Modal -->
  <Teleport to="body">
    <div v-if="registerModal" class="modal-backdrop" @click.self="closeRegister">
      <div class="modal">
        <div class="modal-header">
          <h3>Register device</h3>
          <button class="modal-close" @click="closeRegister">✕</button>
        </div>
        <div v-if="registerErrors.general" class="form-error-banner">{{ registerErrors.general }}</div>
        <form @submit.prevent="submitRegister" class="modal-form">
          <div class="field">
            <label>Hardware Device ID *</label>
            <input v-model="registerForm.deviceId" type="text" placeholder="hw-uuid-123" :class="{ error: registerErrors.deviceId }" />
            <p v-if="registerErrors.deviceId" class="field-error">{{ registerErrors.deviceId }}</p>
            <p class="field-hint">Found on the label of your device</p>
          </div>
          <div class="field">
            <label>Name *</label>
            <input v-model="registerForm.name" type="text" maxlength="100" placeholder="Kitchen feeder" :class="{ error: registerErrors.name }" />
            <p v-if="registerErrors.name" class="field-error">{{ registerErrors.name }}</p>
          </div>
          <div class="field">
            <label>Location</label>
            <input v-model="registerForm.location" type="text" placeholder="Kitchen" />
          </div>
          <div class="field">
            <label>Link to pet</label>
            <select v-model="registerForm.petId" class="select-field">
              <option :value="undefined">— No pet —</option>
              <option v-for="pet in pets" :key="pet.id" :value="pet.id">
                {{ speciesIcon[pet.species] ?? '🐾' }} {{ pet.name }}
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeRegister">Cancel</button>
            <button type="submit" class="btn-confirm" :disabled="registerLoading">
              <AppSpinner v-if="registerLoading" />
              {{ registerLoading ? 'Registering...' : 'Register' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- MQTT Password Modal -->
  <Teleport to="body">
    <div v-if="showMqttModal" class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <h3>Device registered!</h3>
        </div>
        <div class="mqtt-warning">
          <span>⚠️</span>
          <p>Save this MQTT password — it won't be shown again!</p>
        </div>
        <div class="mqtt-password-block">
          <code class="mqtt-password">{{ mqttPassword }}</code>
          <button class="btn-copy" @click="copyMqtt">
            {{ mqttCopied ? 'Copied ✓' : 'Copy' }}
          </button>
        </div>
        <button class="btn-confirm" @click="showMqttModal = false">Done</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.devices-page { display: flex; flex-direction: column; gap: 1.5rem; }

.toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }

.search-wrap { position: relative; flex: 1; min-width: 180px; }
.search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); width: 1rem; height: 1rem; color: #C4875A; pointer-events: none; }
.search-input {
  width: 100%; padding: 0.6rem 0.9rem 0.6rem 2.25rem;
  border: 1.5px solid #E0D3C0; border-radius: 0.75rem;
  font-size: 0.9rem; font-family: 'Outfit', sans-serif;
  background: #fff; color: #2C1208; outline: none;
  transition: border-color 0.2s; box-sizing: border-box;
}
.search-input:focus { border-color: #A0522D; }
.search-input::placeholder { color: #C4875A; opacity: 0.7; }

.btn-add {
  padding: 0.6rem 1.1rem;
  background: #2C1208; color: #F5EDE0;
  border: none; border-radius: 0.75rem;
  font-size: 0.875rem; font-weight: 600; font-family: 'Outfit', sans-serif;
  cursor: pointer; white-space: nowrap; transition: background 0.2s;
}
.btn-add:hover { background: #7B3A18; }

.empty-state {
  text-align: center; padding: 3rem 1rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: #A0522D;
}
.empty-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.empty-state h3 { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 1.1rem; color: #2C1208; }
.empty-state p { font-size: 0.875rem; opacity: 0.8; }
.empty-state .btn-add { margin-top: 0.5rem; }

.devices-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }

.device-card {
  background: #fff; border-radius: 1.25rem; padding: 1.25rem;
  box-shadow: 0 2px 12px rgba(44,18,8,0.06);
  display: flex; flex-direction: column; gap: 0.65rem;
  transition: box-shadow 0.2s;
}
.device-card:hover { box-shadow: 0 4px 20px rgba(44,18,8,0.1); }

.device-card-top { display: flex; align-items: center; justify-content: space-between; }
.device-status-row { display: flex; align-items: center; gap: 0.4rem; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-dot.online { background: #27ae60; }
.status-dot.offline { background: #aaa; }
.status-label { font-size: 0.78rem; font-weight: 600; }
.status-label.online { color: #27ae60; }
.status-label.offline { color: #aaa; }

.details-link { font-size: 0.78rem; font-weight: 600; color: #A0522D; text-decoration: none; }
.details-link:hover { color: #2C1208; }

.device-name { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 1.05rem; color: #2C1208; }
.device-location { font-size: 0.8rem; color: #A0522D; }
.device-pet { font-size: 0.8rem; color: #7B3A18; font-weight: 500; }
.device-pet.no-pet { color: #C4875A; font-weight: 400; }

.food-section { display: flex; flex-direction: column; gap: 0.25rem; }
.food-bar-wrap { display: flex; align-items: center; gap: 0.5rem; }
.food-bar-track { flex: 1; height: 8px; background: #E0D3C0; border-radius: 999px; overflow: hidden; }
.food-bar-fill { height: 100%; border-radius: 999px; transition: width 0.4s; }
.food-pct { font-size: 0.78rem; font-weight: 600; color: #7B3A18; white-space: nowrap; }
.food-pct.low { color: #e74c3c; }
.last-seen { font-size: 0.72rem; color: #C4875A; }

.btn-feed {
  margin-top: 0.25rem; padding: 0.55rem;
  background: #2C1208; color: #F5EDE0;
  border: none; border-radius: 0.75rem;
  font-size: 0.875rem; font-weight: 600; font-family: 'Outfit', sans-serif;
  cursor: pointer; transition: background 0.2s, opacity 0.2s;
}
.btn-feed:hover:not(:disabled) { background: #7B3A18; }
.btn-feed:disabled { opacity: 0.4; cursor: not-allowed; background: #aaa; }
</style>
