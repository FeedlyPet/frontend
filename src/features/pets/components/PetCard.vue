<script setup lang="ts">
import {formatDate, speciesIcon} from '@/shared/utils/formatters.ts'
import type {Pet} from '@/features/pets/api/pet.ts'
import {useI18n} from '@/shared/composables/use-i18n.ts'

const {t} = useI18n()

defineProps<{ pet: Pet }>()

const emit = defineEmits<{
  edit: [pet: Pet]
  delete: [pet: Pet]
}>()
</script>

<template>
  <div class="pet-card">
    <div class="pet-card-top">
      <span class="pet-species-icon">{{ speciesIcon[pet.species] ?? '🐾' }}</span>
      <div class="pet-actions">
        <button class="icon-btn" :title="t.edit" @click="emit('edit', pet)">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z"/>
          </svg>
        </button>
        <button class="icon-btn danger" :title="t.delete" @click="emit('delete', pet)">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-6 0h6"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="pet-name">{{ pet.name }}</div>
    <div class="pet-meta">
      <span class="meta-chip">{{ pet.species }}</span>
      <span v-if="pet.weight" class="meta-chip">{{ pet.weight }} kg</span>
    </div>
    <div class="pet-date">{{ t.addedOn }} {{ formatDate(pet.createdAt) }}</div>
  </div>
</template>

<style scoped>
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

.pet-card:hover { box-shadow: var(--shadow-md); }

.pet-card-top { display: flex; align-items: center; justify-content: space-between; }

.pet-species-icon { font-size: 1.75rem; }

.pet-actions { display: flex; gap: 0.25rem; }

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

.icon-btn:hover { background: var(--bg-page); color: var(--text-primary); }
.icon-btn.danger:hover { background: #FEF0F0; color: #e74c3c; }

.pet-name {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text-primary);
}

.pet-meta { display: flex; gap: 0.35rem; flex-wrap: wrap; }

.meta-chip {
  padding: 0.15rem 0.5rem;
  background: var(--bg-page);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.pet-date { font-size: 0.72rem; color: var(--text-faint); margin-top: 0.25rem; }
</style>
