<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from '@/shared/composables/use-i18n.ts'

const {t} = useI18n()

const props = defineProps<{
  password: string
  title?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const copied = ref(false)

function copy() {
  navigator.clipboard.writeText(props.password)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ title ?? t.mqttPasswordTitle }}</h3>
        </div>
        <div class="mqtt-warning">
          <span>⚠️</span>
          <p>{{ t.mqttSaveWarning }}</p>
        </div>
        <div class="mqtt-password-block">
          <code class="mqtt-password">{{ password }}</code>
          <button class="btn-copy" @click="copy">{{ copied ? t.copied : t.copy }}</button>
        </div>
        <button class="btn-confirm" @click="emit('close')">{{ t.done }}</button>
      </div>
    </div>
  </Teleport>
</template>
