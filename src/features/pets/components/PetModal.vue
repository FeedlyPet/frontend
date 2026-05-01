<script setup lang="ts">
import AppSpinner from '@/shared/components/AppSpinner.vue'
import {speciesIcon} from '@/shared/utils/formatters.ts'
import type {Pet} from '@/features/pets/api/pet.ts'

defineProps<{
  editPet: Pet | null
  form: { name: string; species: string; weight?: number }
  errors: Record<string, string>
  loading: boolean
}>()

const emit = defineEmits<{
  'update:form': [value: { name: string; species: string; weight?: number }]
  submit: []
  close: []
}>()

const speciesOptions = [
  {value: 'cat', label: 'Cat'},
  {value: 'dog', label: 'Dog'},
  {value: 'bird', label: 'Bird'},
  {value: 'other', label: 'Other'},
]
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editPet ? 'Edit pet' : 'Add pet' }}</h3>
          <button class="modal-close" @click="emit('close')">✕</button>
        </div>
        <div v-if="errors.general" class="form-error-banner">{{ errors.general }}</div>
        <form @submit.prevent="emit('submit')" class="modal-form">
          <div class="field">
            <label>Name *</label>
            <input
                :value="form.name"
                @input="emit('update:form', {...form, name: ($event.target as HTMLInputElement).value})"
                type="text" maxlength="100" placeholder="Barsik"
                :class="{ error: errors.name }"
            />
            <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
          </div>
          <div class="field">
            <label>Species *</label>
            <select
                :value="form.species"
                @change="emit('update:form', {...form, species: ($event.target as HTMLSelectElement).value})"
                class="select-field"
            >
              <option v-for="s in speciesOptions" :key="s.value" :value="s.value">
                {{ speciesIcon[s.value] }} {{ s.label }}
              </option>
            </select>
          </div>
          <div class="field">
            <label>Weight (kg)</label>
            <input
                :value="form.weight"
                @input="emit('update:form', {...form, weight: Number(($event.target as HTMLInputElement).value) || undefined})"
                type="number" min="0.1" max="200" step="0.1" placeholder="4.5"
                :class="{ error: errors.weight }"
            />
            <p v-if="errors.weight" class="field-error">{{ errors.weight }}</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="emit('close')">Cancel</button>
            <button type="submit" class="btn-confirm" :disabled="loading">
              <AppSpinner v-if="loading"/>
              {{ loading ? 'Saving...' : (editPet ? 'Save changes' : 'Add pet') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
