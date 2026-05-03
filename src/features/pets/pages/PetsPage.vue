<script setup lang="ts">
import {ref, watch, computed, onMounted} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import {petsApi} from '../api/pets.api.ts'
import AppSpinner from '@/shared/components/AppSpinner.vue'

import {useToast} from '@/shared/composables/use-toast.ts'
import {useDebounce} from '@/shared/composables/use-debounce.ts'
import {extractErrorMessage} from '@/shared/utils/error-handler.ts'
import {useI18n} from '@/shared/composables/use-i18n.ts'
import PetCard from '../components/PetCard.vue'
import PetModal from '../components/PetModal.vue'
import type {CreatePetDto} from "@/features/pets/api/create-pet.dto.ts";
import type {Pet} from "@/features/pets/api/pet.ts";

const toast = useToast()
const {t} = useI18n()

const router = useRouter()
const route = useRoute()

const pets = ref<Pet[]>([])
const total = ref(0)
const loading = ref(true)
const page = ref(Number(route.query.page) || 1)
const search = ref((route.query.search as string) || '')
const sortBy = ref((route.query.sortBy as string) || 'createdAt')
const sortOrder = ref((route.query.sortOrder as string) || 'DESC')
const limit = 10

const showModal = ref(false)
const editPet = ref<Pet | null>(null)
const modalLoading = ref(false)
const modalErrors = ref<Record<string, string>>({})
const form = ref<CreatePetDto & { weight?: number }>({name: '', species: 'cat', weight: undefined})

const confirmPet = ref<Pet | null>(null)
const deleteLoading = ref(false)

const totalPages = computed(() => Math.ceil(total.value / limit))

async function fetchPets() {
  loading.value = true
  try {
    const res = await petsApi.getAll({
      page: page.value,
      limit,
      search: search.value || undefined,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
    pets.value = res.data
    total.value = res.meta.total
  } catch {
    toast.error(t.value.failedToLoad)
  } finally {
    loading.value = false
  }
}

function syncUrl() {
  router.replace({
    query: {
      ...(page.value > 1 ? {page: page.value} : {}),
      ...(search.value ? {search: search.value} : {}),
      ...(sortBy.value !== 'createdAt' ? {sortBy: sortBy.value} : {}),
      ...(sortOrder.value !== 'DESC' ? {sortOrder: sortOrder.value} : {}),
    },
  })
}

const debouncedSearch = useDebounce(() => {
  page.value = 1;
  syncUrl();
  fetchPets()
})

watch([page, sortBy, sortOrder], () => {
  syncUrl();
  fetchPets()
})
watch(search, (val, old) => {
  if (val !== old) debouncedSearch()
})

onMounted(fetchPets)

function openCreate() {
  editPet.value = null
  form.value = {name: '', species: 'cat', weight: undefined}
  modalErrors.value = {}
  showModal.value = true
}

function openEdit(pet: Pet) {
  editPet.value = pet
  form.value = {name: pet.name, species: pet.species, weight: pet.weight}
  modalErrors.value = {}
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function validateForm(): boolean {
  modalErrors.value = {}
  if (!form.value.name) modalErrors.value.name = t.value.nameRequired
  else if (form.value.name.length > 100) modalErrors.value.name = t.value.nameTooLong
  if (form.value.weight != null && (form.value.weight < 0.1 || form.value.weight > 200))
    modalErrors.value.weight = t.value.weightRange
  return Object.keys(modalErrors.value).length === 0
}

async function submitModal() {
  if (!validateForm()) return
  modalLoading.value = true
  try {
    const dto = {name: form.value.name, species: form.value.species, weight: form.value.weight || undefined}
    if (editPet.value) {
      const updated = await petsApi.update(editPet.value.id, dto)
      const idx = pets.value.findIndex(p => p.id === editPet.value!.id)
      if (idx !== -1) pets.value[idx] = updated
      toast.success(t.value.petUpdated)
    } else {
      const created = await petsApi.create(dto)
      total.value++
      if (pets.value.length < limit) pets.value.unshift(created)
      toast.success(t.value.petAdded)
    }
    closeModal()
  } catch (e: unknown) {
    modalErrors.value.general = extractErrorMessage(e, t.value.failedToSave)
  } finally {
    modalLoading.value = false
  }
}

async function confirmDelete() {
  if (!confirmPet.value) return
  deleteLoading.value = true
  try {
    await petsApi.remove(confirmPet.value.id)
    pets.value = pets.value.filter(p => p.id !== confirmPet.value!.id)
    total.value--
    confirmPet.value = null
    toast.success(t.value.petDeleted)
  } catch {
    toast.error(t.value.failedToDelete)
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="pets-page">
    <div class="toolbar">
      <div class="search-wrap">
        <svg class="search-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
        </svg>
        <input v-model="search" type="text" :placeholder="t.searchPets" class="search-input"/>
      </div>

      <div class="sort-wrap">
        <select v-model="sortBy" class="select">
          <option value="name">{{ t.sortName }}</option>
          <option value="species">{{ t.sortSpecies }}</option>
          <option value="weight">{{ t.sortWeight }}</option>
          <option value="createdAt">{{ t.sortDateAdded }}</option>
        </select>
        <button class="sort-dir-btn" @click="sortOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC'">
          {{ sortOrder === 'ASC' ? '↑' : '↓' }}
        </button>
      </div>

      <button class="btn-add" @click="openCreate">+ {{ t.addPet }}</button>
    </div>

    <div v-if="loading" class="pets-grid">
      <div v-for="i in 6" :key="i" class="skeleton" style="height:140px"></div>
    </div>

    <div v-else-if="pets.length === 0" class="empty-state">
      <div class="empty-icon">🐾</div>
      <h3>{{ t.noPetsYet }}</h3>
      <p v-if="search">{{ t.noResults }} "{{ search }}"</p>
      <p v-else>{{ t.addFirstPet }}</p>
      <button class="btn-add" @click="openCreate">{{ t.addPet }}</button>
    </div>

    <div v-else class="pets-grid">
      <PetCard
          v-for="pet in pets"
          :key="pet.id"
          :pet="pet"
          @edit="openEdit"
          @delete="confirmPet = $event"
      />
    </div>

    <div v-if="!loading && totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="page--">←</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="page >= totalPages" @click="page++">→</button>
    </div>
  </div>

  <PetModal
      v-if="showModal"
      :edit-pet="editPet"
      :form="form"
      :errors="modalErrors"
      :loading="modalLoading"
      @update:form="form = $event"
      @submit="submitModal"
      @close="closeModal"
  />

  <Teleport to="body">
    <div v-if="confirmPet" class="modal-backdrop" @click.self="confirmPet = null">
      <div class="modal confirm-modal">
        <div class="confirm-icon">⚠️</div>
        <h3 class="confirm-title">Delete "{{ confirmPet.name }}"?</h3>
        <p class="confirm-text">{{ t.thisActionCannotBeUndone }}</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="confirmPet = null">{{ t.cancel }}</button>
          <button class="btn-danger" :disabled="deleteLoading" @click="confirmDelete">
            <AppSpinner v-if="deleteLoading"/>
            {{ deleteLoading ? t.deleting : t.delete }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pets-page {
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

@media (max-width: 480px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .sort-wrap {
    flex: 1;
  }
  .btn-add {
    width: 100%;
    text-align: center;
  }
}

.search-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  width: 100%;
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

.sort-wrap {
  display: flex;
  gap: 0.35rem;
}

.select {
  padding: 0.6rem 0.75rem;
  border: 1.5px solid var(--border);
  border-radius: 0.75rem;
  font-size: 0.85rem;
  font-family: 'Outfit', sans-serif;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
}

.sort-dir-btn {
  padding: 0.6rem 0.75rem;
  border: 1.5px solid var(--border);
  border-radius: 0.75rem;
  background: var(--bg-card);
  font-size: 1rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s;
}

.sort-dir-btn:hover {
  background: var(--bg-page);
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

.pets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}

.pet-card {
  background: var(--bg-card);
  border-radius: 1.25rem;
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: box-shadow 0.2s;
}

.pet-card:hover {
  box-shadow: var(--shadow-md);
}

.pet-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pet-species-icon {
  font-size: 1.75rem;
}

.pet-actions {
  display: flex;
  gap: 0.25rem;
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

.pet-name {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text-primary);
}

.pet-meta {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.meta-chip {
  padding: 0.15rem 0.5rem;
  background: var(--bg-page);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.pet-date {
  font-size: 0.72rem;
  color: var(--text-faint);
  margin-top: 0.25rem;
}
</style>
