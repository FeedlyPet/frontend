<script setup lang="ts">
import {useToast} from '@/shared/composables/use-toast.ts'

const {toasts, remove} = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
            v-for="toast in toasts"
            :key="toast.id"
            class="toast"
            :class="`toast--${toast.type}`"
            @click="remove(toast.id)"
        >
          <span class="toast-icon">
            <template v-if="toast.type === 'success'">✓</template>
            <template v-else-if="toast.type === 'error'">✕</template>
            <template v-else-if="toast.type === 'warning'">⚠</template>
            <template v-else>ℹ</template>
          </span>
          <span class="toast-msg">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 0.85rem;
  font-size: 0.875rem;
  font-family: 'Outfit', sans-serif;
  font-weight: 500;
  min-width: 240px;
  max-width: 360px;
  cursor: pointer;
  pointer-events: all;
  box-shadow: 0 4px 20px rgba(44, 18, 8, 0.18);
  word-break: break-word;
}

.toast--success {
  background: #2C1208;
  color: #F5EDE0;
}

.toast--error {
  background: #c0392b;
  color: #fff;
}

.toast--warning {
  background: #7B3A18;
  color: #F5EDE0;
}

.toast--info {
  background: #A0522D;
  color: #F5EDE0;
}

.toast-icon {
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
  width: 18px;
  text-align: center;
}

.toast-msg {
  flex: 1;
  line-height: 1.4;
}

.toast-enter-active {
  transition: all 0.25s ease;
}

.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
