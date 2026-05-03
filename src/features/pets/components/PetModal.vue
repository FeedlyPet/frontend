<script setup lang="ts">
import {computed} from 'vue'
import AppSpinner from '@/shared/components/AppSpinner.vue'
import {speciesIcon} from '@/shared/utils/formatters.ts'
import type {Pet} from '@/features/pets/api/pet.ts'
import {useI18n} from '@/shared/composables/use-i18n.ts'

const {t} = useI18n()

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

const speciesOptions = computed(() => [
  {value: 'cat', label: t.value.speciesCat},
  {value: 'dog', label: t.value.speciesDog},
  {value: 'other', label: t.value.speciesOther},
])
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editPet ? t.editPet : t.addPet }}</h3>
          <button class="modal-close" @click="emit('close')">✕</button>
        </div>
        <div v-if="errors.general" class="form-error-banner">{{ errors.general }}</div>
        <form @submit.prevent="emit('submit')" class="modal-form">
          <div class="field">
            <label>{{ t.nameField }}</label>
            <input
                :value="form.name"
                @input="emit('update:form', {...form, name: ($event.target as HTMLInputElement).value})"
                type="text" maxlength="100" placeholder="Barsik"
                :class="{ error: errors.name }"
            />
            <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
          </div>
          <div class="field">
            <label>{{ t.speciesField }}</label>
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
            <label>{{ t.weightField }}</label>
            <input
                :value="form.weight"
                @input="emit('update:form', {...form, weight: Number(($event.target as HTMLInputElement).value) || undefined})"
                type="number" min="0.1" max="200" step="0.1" placeholder="4.5"
                :class="{ error: errors.weight }"
            />
            <p v-if="errors.weight" class="field-error">{{ errors.weight }}</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="emit('close')">{{ t.cancel }}</button>
            <button type="submit" class="btn-confirm" :disabled="loading">
              <AppSpinner v-if="loading"/>
              {{ loading ? t.saving : (editPet ? t.saveChanges : t.addPet) }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
