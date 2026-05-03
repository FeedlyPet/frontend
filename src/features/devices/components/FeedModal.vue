<script setup lang="ts">
import AppSpinner from '@/shared/components/AppSpinner.vue'
import {useI18n} from '@/shared/composables/use-i18n.ts'

const {t} = useI18n()

defineProps<{
  deviceName?: string
  portionSize: number
  loading: boolean
  success: boolean
}>()

const emit = defineEmits<{
  'update:portionSize': [value: number]
  confirm: []
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ t.feedNowTitle }}{{ deviceName ? ` — ${deviceName}` : '' }}</h3>
          <button class="modal-close" @click="emit('close')">✕</button>
        </div>
        <div v-if="success" class="feed-success">
          <span class="success-icon">✅</span>
          <p>{{ t.commandSent }}</p>
        </div>
        <template v-else>
          <div class="portion-field">
            <label>{{ t.portionSize }}: <strong>{{ portionSize }}g</strong></label>
            <input
                type="range"
                :value="portionSize"
                @input="emit('update:portionSize', Number(($event.target as HTMLInputElement).value))"
                min="10" max="500" step="10"
                class="slider"
            />
            <div class="slider-labels"><span>10g</span><span>500g</span></div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="emit('close')">{{ t.cancel }}</button>
            <button class="btn-confirm" :disabled="loading" @click="emit('confirm')">
              <AppSpinner v-if="loading"/>
              {{ loading ? t.sending : t.confirm }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
