<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { petsApi } from '../api/petsApi.ts'
import AppSpinner from '../components/AppSpinner.vue'
import { formatDate, speciesIcon } from '../utils/formatters.ts'
import type { Pet, CreatePetDto } from '../api/petsApi.ts'

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

let searchDebounce: ReturnType<typeof setTimeout>

const showModal = ref(false)
const editPet = ref<Pet | null>(null)
const modalLoading = ref(false)
const modalErrors = ref<Record<string, string>>({})
const form = ref<CreatePetDto & { weight?: number }>({ name: '', species: 'cat', weight: undefined })

const confirmPet = ref<Pet | null>(null)
const deleteLoading = ref(false)

const speciesOptions = [
  { value: 'cat', label: 'Cat' },
  { value: 'dog', label: 'Dog' },
  { value: 'bird', label: 'Bird' },
  { value: 'other', label: 'Other' },
]

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
    total.value = res.total
  } catch {
  } finally {
    loading.value = false
  }
}

function syncUrl() {
  router.replace({
    query: {
      ...(page.value > 1 ? { page: page.value } : {}),
      ...(search.value ? { search: search.value } : {}),
      ...(sortBy.value !== 'createdAt' ? { sortBy: sortBy.value } : {}),
      ...(sortOrder.value !== 'DESC' ? { sortOrder: sortOrder.value } : {}),
    },
  })
}

watch([page, sortBy, sortOrder], () => { syncUrl(); fetchPets() })

watch(search, (val, old) => {
  if (val === old) return
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    page.value = 1
    syncUrl()
    fetchPets()
  }, 300)
})

onMounted(fetchPets)
onBeforeUnmount(() => clearTimeout(searchDebounce))

function openCreate() {
  editPet.value = null
  form.value = { name: '', species: 'cat', weight: undefined }
  modalErrors.value = {}
  showModal.value = true
}

function openEdit(pet: Pet) {
  editPet.value = pet
  form.value = { name: pet.name, species: pet.species, weight: pet.weight }
  modalErrors.value = {}
  showModal.value = true
}

function closeModal() { showModal.value = false }

function validateForm(): boolean {
  modalErrors.value = {}
  if (!form.value.name) modalErrors.value.name = 'Name is required'
  else if (form.value.name.length > 100) modalErrors.value.name = 'Max 100 characters'
  if (form.value.weight != null && (form.value.weight < 0.1 || form.value.weight > 200))
    modalErrors.value.weight = 'Weight must be 0.1–200 kg'
  return Object.keys(modalErrors.value).length === 0
}

async function submitModal() {
  if (!validateForm()) return
  modalLoading.value = true
  try {
    const dto = { name: form.value.name, species: form.value.species, weight: form.value.weight || undefined }
    if (editPet.value) {
      const updated = await petsApi.update(editPet.value.id, dto)
      const idx = pets.value.findIndex(p => p.id === editPet.value!.id)
      if (idx !== -1) pets.value[idx] = updated
    } else {
      const created = await petsApi.create(dto)
      total.value++
      if (pets.value.length < limit) pets.value.unshift(created)
    }
    closeModal()
  } catch (e: unknown) {
    const msg = (e as any)?.response?.data?.message
    modalErrors.value.general = msg ?? 'Failed to save'
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
  } catch {
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="pets-page">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-wrap">
        <svg class="search-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
        </svg>
        <input v-model="search" type="text" placeholder="Search pets..." class="search-input" />
      </div>

      <div class="sort-wrap">
        <select v-model="sortBy" class="select">
          <option value="name">Name</option>
          <option value="species">Species</option>
          <option value="weight">Weight</option>
          <option value="createdAt">Date added</option>
        </select>
        <button class="sort-dir-btn" @click="sortOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC'">
          {{ sortOrder === 'ASC' ? '↑' : '↓' }}
        </button>
      </div>

      <button class="btn-add" @click="openCreate">+ Add pet</button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="pets-grid">
      <div v-for="i in 6" :key="i" class="skeleton" style="height:140px"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="pets.length === 0" class="empty-state">
      <div class="empty-icon">🐾</div>
      <h3>No pets yet</h3>
      <p v-if="search">No results for "{{ search }}"</p>
      <p v-else>Add your first pet to get started!</p>
      <button class="btn-add" @click="openCreate">Add pet</button>
    </div>

    <!-- Grid -->
    <div v-else class="pets-grid">
      <div v-for="pet in pets" :key="pet.id" class="pet-card">
        <div class="pet-card-top">
          <span class="pet-species-icon">{{ speciesIcon[pet.species] ?? '🐾' }}</span>
          <div class="pet-actions">
            <button class="icon-btn" title="Edit" @click="openEdit(pet)">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z"/>
              </svg>
            </button>
            <button class="icon-btn danger" title="Delete" @click="confirmPet = pet">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-6 0h6"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="pet-name">{{ pet.name }}</div>
        <div class="pet-meta">
          <span class="meta-chip">{{ pet.species }}</span>
          <span v-if="pet.weight" class="meta-chip">{{ pet.weight }} kg</span>
        </div>
        <div class="pet-date">Added {{ formatDate(pet.createdAt) }}</div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="page--">←</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="page >= totalPages" @click="page++">→</button>
    </div>
  </div>

  <!-- Pet Modal -->
  <Teleport to="body">
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editPet ? 'Edit pet' : 'Add pet' }}</h3>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div v-if="modalErrors.general" class="form-error-banner">{{ modalErrors.general }}</div>
        <form @submit.prevent="submitModal" class="modal-form">
          <div class="field">
            <label>Name *</label>
            <input v-model="form.name" type="text" maxlength="100" placeholder="Barsik" :class="{ error: modalErrors.name }" />
            <p v-if="modalErrors.name" class="field-error">{{ modalErrors.name }}</p>
          </div>
          <div class="field">
            <label>Species *</label>
            <select v-model="form.species" class="select-field">
              <option v-for="s in speciesOptions" :key="s.value" :value="s.value">
                {{ speciesIcon[s.value] }} {{ s.label }}
              </option>
            </select>
          </div>
          <div class="field">
            <label>Weight (kg)</label>
            <input v-model.number="form.weight" type="number" min="0.1" max="200" step="0.1" placeholder="4.5" :class="{ error: modalErrors.weight }" />
            <p v-if="modalErrors.weight" class="field-error">{{ modalErrors.weight }}</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeModal">Cancel</button>
            <button type="submit" class="btn-confirm" :disabled="modalLoading">
              <AppSpinner v-if="modalLoading" />
              {{ modalLoading ? 'Saving...' : (editPet ? 'Save changes' : 'Add pet') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- Confirm delete -->
  <Teleport to="body">
    <div v-if="confirmPet" class="modal-backdrop" @click.self="confirmPet = null">
      <div class="modal confirm-modal">
        <div class="confirm-icon">⚠️</div>
        <h3 class="confirm-title">Delete "{{ confirmPet.name }}"?</h3>
        <p class="confirm-text">This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="confirmPet = null">Cancel</button>
          <button class="btn-danger" :disabled="deleteLoading" @click="confirmDelete">
            <AppSpinner v-if="deleteLoading" />
            {{ deleteLoading ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pets-page { display: flex; flex-direction: column; gap: 1.5rem; }

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

.sort-wrap { display: flex; gap: 0.35rem; }
.select {
  padding: 0.6rem 0.75rem; border: 1.5px solid #E0D3C0; border-radius: 0.75rem;
  font-size: 0.85rem; font-family: 'Outfit', sans-serif; background: #fff; color: #2C1208; cursor: pointer; outline: none;
}
.sort-dir-btn {
  padding: 0.6rem 0.75rem; border: 1.5px solid #E0D3C0; border-radius: 0.75rem;
  background: #fff; font-size: 1rem; color: #7B3A18; cursor: pointer; transition: background 0.2s;
}
.sort-dir-btn:hover { background: #F5EDE0; }

.btn-add {
  padding: 0.6rem 1.1rem; background: #2C1208; color: #F5EDE0;
  border: none; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 600;
  font-family: 'Outfit', sans-serif; cursor: pointer; white-space: nowrap; transition: background 0.2s;
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

.pets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }

.pet-card {
  background: #fff; border-radius: 1.25rem; padding: 1.25rem;
  box-shadow: 0 2px 12px rgba(44,18,8,0.06);
  display: flex; flex-direction: column; gap: 0.5rem; transition: box-shadow 0.2s;
}
.pet-card:hover { box-shadow: 0 4px 20px rgba(44,18,8,0.1); }
.pet-card-top { display: flex; align-items: center; justify-content: space-between; }
.pet-species-icon { font-size: 1.75rem; }
.pet-actions { display: flex; gap: 0.25rem; }
.icon-btn {
  padding: 0.3rem; border: none; border-radius: 0.5rem; background: none;
  cursor: pointer; color: #A0522D; transition: background 0.2s, color 0.2s; display: flex; align-items: center;
}
.icon-btn:hover { background: #F5EDE0; color: #2C1208; }
.icon-btn.danger:hover { background: #FEF0F0; color: #e74c3c; }
.pet-name { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 1.05rem; color: #2C1208; }
.pet-meta { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.meta-chip { padding: 0.15rem 0.5rem; background: #F5EDE0; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: #7B3A18; text-transform: capitalize; }
.pet-date { font-size: 0.72rem; color: #C4875A; margin-top: 0.25rem; }
</style>
