<script setup lang="ts">
import {ref} from 'vue'

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
          <h3>{{ title ?? 'MQTT password' }}</h3>
        </div>
        <div class="mqtt-warning">
          <span>⚠️</span>
          <p>Save this password — it won't be shown again!</p>
        </div>
        <div class="mqtt-password-block">
          <code class="mqtt-password">{{ password }}</code>
          <button class="btn-copy" @click="copy">{{ copied ? 'Copied ✓' : 'Copy' }}</button>
        </div>
        <button class="btn-confirm" @click="emit('close')">Done</button>
      </div>
    </div>
  </Teleport>
</template>
