<script setup lang="ts">
import {ref, onMounted, computed} from 'vue'
import {useRoute} from 'vue-router'
import {schedulesApi} from '../api/schedules.api.ts'
import {DAYS, DAY_LABELS} from '../api/day.ts'
import AppSpinner from '@/shared/components/AppSpinner.vue'
import type {Day} from '../api/day.ts'
import {useToast} from '@/shared/composables/use-toast.ts'
import {extractErrorMessage} from '@/shared/utils/error-handler.ts'
import type {Schedule} from "@/features/schedules/api/schedule.ts";
import type {CreateScheduleDto} from "@/features/schedules/api/create-schedule.dto.ts";
import type {UpdateScheduleDto} from "@/features/schedules/api/update-schedule.dto.ts";

const toast = useToast()

const route = useRoute()
const deviceId = route.params.deviceId as string

const schedules = ref<Schedule[]>([])
const loading = ref(true)
const filterActive = ref<'all' | 'active' | 'inactive'>('all')

const showModal = ref(false)
const editSchedule = ref<Schedule | null>(null)
const modalLoading = ref(false)
const modalErrors = ref<Record<string, string>>({})
const form = ref<CreateScheduleDto>({feedingTime: '08:00', portionSize: 100, isActive: true, daysOfWeek: []})

const confirmSchedule = ref<Schedule | null>(null)
const deleteLoading = ref(false)

const togglingId = ref<string | null>(null)

const filtered = computed(() => {
  if (filterActive.value === 'active') return schedules.value.filter(s => s.isActive)
  if (filterActive.value === 'inactive') return schedules.value.filter(s => !s.isActive)
  return schedules.value
})

onMounted(fetchSchedules)

async function fetchSchedules() {
  loading.value = true
  try {
    const res = await schedulesApi.getAll(deviceId, {sortBy: 'feedingTime', sortOrder: 'ASC'})
    schedules.value = res.data
  } catch {
    toast.error('Failed to load schedules')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editSchedule.value = null
  form.value = {feedingTime: '08:00', portionSize: 100, isActive: true, daysOfWeek: []}
  modalErrors.value = {}
  showModal.value = true
}

function openEdit(s: Schedule) {
  editSchedule.value = s
  form.value = {
    feedingTime: s.feedingTime,
    portionSize: s.portionSize,
    isActive: s.isActive,
    daysOfWeek: [...s.daysOfWeek]
  }
  modalErrors.value = {}
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function toggleDay(day: Day) {
  const idx = form.value.daysOfWeek.indexOf(day)
  if (idx === -1) form.value.daysOfWeek.push(day)
  else form.value.daysOfWeek.splice(idx, 1)
}

function selectAllDays() {
  form.value.daysOfWeek = [...DAYS]
}

function validateForm(): boolean {
  modalErrors.value = {}
  if (!form.value.feedingTime) modalErrors.value.feedingTime = 'Time is required'
  if (form.value.portionSize < 10 || form.value.portionSize > 500)
    modalErrors.value.portionSize = 'Portion must be 10–500 g'
  if (form.value.daysOfWeek.length === 0)
    modalErrors.value.daysOfWeek = 'Select at least one day'
  return Object.keys(modalErrors.value).length === 0
}

async function submitModal() {
  if (!validateForm()) return
  modalLoading.value = true
  try {
    const dto: CreateScheduleDto = {
      feedingTime: form.value.feedingTime,
      portionSize: form.value.portionSize,
      isActive: form.value.isActive,
      daysOfWeek: [...DAYS].filter(d => form.value.daysOfWeek.includes(d)),
    }
    if (editSchedule.value) {
      const updated = await schedulesApi.update(editSchedule.value.id, dto as UpdateScheduleDto)
      const idx = schedules.value.findIndex(s => s.id === editSchedule.value!.id)
      if (idx !== -1) schedules.value[idx] = updated
      toast.success('Schedule updated')
    } else {
      const created = await schedulesApi.create(deviceId, dto)
      schedules.value.push(created)
      schedules.value.sort((a, b) => a.feedingTime.localeCompare(b.feedingTime))
      toast.success('Schedule added')
    }
    closeModal()
  } catch (e: unknown) {
    modalErrors.value.general = extractErrorMessage(e, 'Failed to save')
  } finally {
    modalLoading.value = false
  }
}

async function toggle(s: Schedule) {
  togglingId.value = s.id
  const prev = s.isActive
  s.isActive = !prev
  try {
    const updated = await schedulesApi.toggle(s.id)
    s.isActive = updated.isActive
  } catch {
    s.isActive = prev
    toast.error('Failed to toggle schedule')
  } finally {
    togglingId.value = null
  }
}

async function confirmDelete() {
  if (!confirmSchedule.value) return
  deleteLoading.value = true
  try {
    await schedulesApi.remove(confirmSchedule.value.id)
    schedules.value = schedules.value.filter(s => s.id !== confirmSchedule.value!.id)
    confirmSchedule.value = null
    toast.success('Schedule deleted')
  } catch {
    toast.error('Failed to delete schedule')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="schedules-page">
    <RouterLink :to="`/devices/${deviceId}`" class="breadcrumb">← Device</RouterLink>

    <div class="toolbar">
      <div class="filter-tabs">
        <button class="tab-btn" :class="{ active: filterActive === 'all' }" @click="filterActive = 'all'">All</button>
        <button class="tab-btn" :class="{ active: filterActive === 'active' }" @click="filterActive = 'active'">Active
        </button>
        <button class="tab-btn" :class="{ active: filterActive === 'inactive' }" @click="filterActive = 'inactive'">
          Inactive
        </button>
      </div>
      <button class="btn-add" @click="openCreate">+ Add schedule</button>
    </div>

    <div v-if="loading" class="sched-list">
      <div v-for="i in 3" :key="i" class="skeleton" style="height:100px"></div>
    </div>

    <div v-else-if="filtered.length === 0" class="empty-state">
      <div class="empty-icon">📅</div>
      <h3>No schedules</h3>
      <p v-if="filterActive !== 'all'">No {{ filterActive }} schedules</p>
      <p v-else>Add your first feeding schedule!</p>
      <button v-if="filterActive === 'all'" class="btn-add" @click="openCreate">Add schedule</button>
    </div>

    <div v-else class="sched-list">
      <div v-for="s in filtered" :key="s.id" class="sched-card" :class="{ inactive: !s.isActive }">
        <div class="sched-main">
          <div class="sched-time">{{ s.feedingTime }}</div>
          <div class="sched-days">
            <span
                v-for="d in DAYS"
                :key="d"
                class="day-chip"
                :class="{ active: s.daysOfWeek.includes(d) }"
            >{{ DAY_LABELS[d] }}</span>
          </div>
          <div class="sched-portion">{{ s.portionSize }}g</div>
        </div>
        <div class="sched-actions">
          <button
              class="toggle-btn"
              :class="{ on: s.isActive }"
              :disabled="togglingId === s.id"
              @click="toggle(s)"
              :title="s.isActive ? 'Disable' : 'Enable'"
          >
            <span class="toggle-knob"></span>
          </button>
          <button class="icon-btn" title="Edit" @click="openEdit(s)">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z"/>
            </svg>
          </button>
          <button class="icon-btn danger" title="Delete" @click="confirmSchedule = s">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-6 0h6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editSchedule ? 'Edit schedule' : 'Add schedule' }}</h3>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div v-if="modalErrors.general" class="form-error-banner">{{ modalErrors.general }}</div>
        <form @submit.prevent="submitModal" class="modal-form">

          <div class="field">
            <label>Feeding time *</label>
            <input v-model="form.feedingTime" type="time" :class="{ error: modalErrors.feedingTime }"/>
            <p v-if="modalErrors.feedingTime" class="field-error">{{ modalErrors.feedingTime }}</p>
          </div>

          <div class="field">
            <label>Portion size (g) *</label>
            <input v-model.number="form.portionSize" type="number" min="10" max="500" step="10"
                   :class="{ error: modalErrors.portionSize }"/>
            <p v-if="modalErrors.portionSize" class="field-error">{{ modalErrors.portionSize }}</p>
          </div>

          <div class="field">
            <div class="days-label-row">
              <label>Days *</label>
              <button type="button" class="everyday-btn" @click="selectAllDays">Every day</button>
            </div>
            <div class="days-picker">
              <button
                  v-for="d in DAYS"
                  :key="d"
                  type="button"
                  class="day-pick-btn"
                  :class="{ active: form.daysOfWeek.includes(d) }"
                  @click="toggleDay(d)"
              >{{ DAY_LABELS[d] }}
              </button>
            </div>
            <p v-if="modalErrors.daysOfWeek" class="field-error">{{ modalErrors.daysOfWeek }}</p>
          </div>

          <div class="field toggle-field">
            <label>Active</label>
            <button
                type="button"
                class="toggle-btn"
                :class="{ on: form.isActive }"
                @click="form.isActive = !form.isActive"
            >
              <span class="toggle-knob"></span>
            </button>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeModal">Cancel</button>
            <button type="submit" class="btn-confirm" :disabled="modalLoading">
              <AppSpinner v-if="modalLoading"/>
              {{ modalLoading ? 'Saving...' : (editSchedule ? 'Save changes' : 'Add schedule') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="confirmSchedule" class="modal-backdrop" @click.self="confirmSchedule = null">
      <div class="modal confirm-modal">
        <div class="confirm-icon">⚠️</div>
        <h3 class="confirm-title">Delete schedule?</h3>
        <p class="confirm-text">{{ confirmSchedule.feedingTime }} · {{ confirmSchedule.portionSize }}g. This action
          cannot be undone.</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="confirmSchedule = null">Cancel</button>
          <button class="btn-danger" :disabled="deleteLoading" @click="confirmDelete">
            <AppSpinner v-if="deleteLoading"/>
            {{ deleteLoading ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.schedules-page {
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

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.filter-tabs {
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

.sched-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sched-card {
  background: var(--bg-card);
  border-radius: 1.1rem;
  padding: 1rem 1.25rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: opacity 0.2s;
}

.sched-card.inactive {
  opacity: 0.6;
}

.sched-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  min-width: 0;
}

.sched-time {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.4rem;
  color: var(--text-primary);
  min-width: 60px;
}

.sched-days {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.day-chip {
  padding: 0.15rem 0.4rem;
  border-radius: 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--bg-page);
  color: var(--text-faint);
  transition: all 0.15s;
}

.day-chip.active {
  background: var(--brown-dark);
  color: var(--bg-page);
}

.sched-portion {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.sched-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.toggle-btn {
  position: relative;
  width: 38px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: var(--border);
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.toggle-btn.on {
  background: #27ae60;
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-card);
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-btn.on .toggle-knob {
  transform: translateX(16px);
}

.icon-btn {
  padding: 0.3rem;
  border: none;
  border-radius: 0.5rem;
  background: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: background 0.2s, color 0.2s;
  display: flex;
  align-items: center;
}

.icon-btn:hover {
  background: var(--bg-page);
  color: var(--text-primary);
}

.icon-btn.danger:hover {
  background: #FEF0F0;
  color: #e74c3c;
}

.days-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.everyday-btn {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  padding: 0;
}

.everyday-btn:hover {
  color: var(--text-primary);
}

.days-picker {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.day-pick-btn {
  padding: 0.35rem 0.55rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Outfit', sans-serif;
}

.day-pick-btn.active {
  background: var(--brown-dark);
  color: var(--bg-page);
  border-color: var(--brown-dark);
}

.toggle-field {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.toggle-field label {
  margin-bottom: 0;
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
  .sched-card {
    flex-wrap: wrap;
    gap: 0.65rem;
  }
  .sched-main {
    gap: 0.75rem;
  }
  .sched-time {
    font-size: 1.2rem;
    min-width: auto;
  }
}
</style>
