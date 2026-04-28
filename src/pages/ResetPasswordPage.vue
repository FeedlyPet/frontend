<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authApi } from '../api/authApi.ts'
import AppLogo from '../components/AppLogo.vue'
import AppSpinner from '../components/AppSpinner.vue'

const router = useRouter()
const route = useRoute()

const token = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errors = ref<Record<string, string>>({})
const loading = ref(false)
const success = ref(false)
const countdown = ref(3)

const passwordMismatch = computed(
  () => confirmPassword.value.length > 0 && confirmPassword.value !== newPassword.value,
)

onMounted(() => {
  token.value = (route.query.token as string) ?? ''
  if (!token.value) router.push('/forgot-password')
})

function validate(): boolean {
  errors.value = {}
  if (newPassword.value.length < 8) errors.value.newPassword = 'Password must be at least 8 characters'
  else if (!/[a-zA-Z]/.test(newPassword.value) || !/\d/.test(newPassword.value))
    errors.value.newPassword = 'Password must contain a letter and a number'
  if (newPassword.value !== confirmPassword.value) errors.value.confirmPassword = 'Passwords do not match'
  return Object.keys(errors.value).length === 0
}

async function submit() {
  if (!validate()) return
  loading.value = true
  try {
    await authApi.resetPassword(token.value, newPassword.value)
    success.value = true
    const t = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) { clearInterval(t); router.push('/login') }
    }, 1000)
  } catch {
    errors.value.general = 'The link is invalid or has expired'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <AppLogo variant="light" :size="36" />
        <span class="auth-logo-text">Feedly<span>Pet</span></span>
      </div>

      <div v-if="success" class="text-center">
        <div class="success-icon">✅</div>
        <h2 class="auth-title">Password changed!</h2>
        <p class="auth-subtitle">Redirecting to sign in in {{ countdown }}s...</p>
        <RouterLink to="/login" class="btn-submit" style="text-decoration:none; margin-top:1.5rem;">Sign in now</RouterLink>
      </div>

      <template v-else>
        <h1 class="auth-title">New password</h1>
        <p class="auth-subtitle">Choose a strong password for your account</p>

        <div v-if="errors.general" class="error-msg error-msg--block">
          {{ errors.general }}
          <RouterLink to="/forgot-password" class="error-link">Request a new link →</RouterLink>
        </div>

        <form @submit.prevent="submit" class="auth-form">
          <div class="field">
            <label>New password</label>
            <input v-model="newPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="••••••••" :class="{ error: errors.newPassword }" />
            <p v-if="errors.newPassword" class="field-error">{{ errors.newPassword }}</p>
          </div>
          <div class="field">
            <label>Confirm password</label>
            <input v-model="confirmPassword" type="password" required autocomplete="new-password" placeholder="••••••••" :class="{ error: errors.confirmPassword || passwordMismatch }" />
            <p v-if="passwordMismatch || errors.confirmPassword" class="field-error">{{ errors.confirmPassword || 'Passwords do not match' }}</p>
          </div>

          <button type="submit" :disabled="loading" class="btn-submit">
            <AppSpinner v-if="loading" />
            {{ loading ? 'Saving...' : 'Save password' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.error-msg--block { border-radius: 0.75rem; padding: 0.75rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
.error-link { color: #A0522D; text-decoration: none; font-weight: 600; }
</style>
