<script setup lang="ts">
import {ref, computed} from 'vue'
import axios from 'axios'
import {useRouter} from 'vue-router'
import {authApi} from '../api/auth.api.ts'
import AppLogo from '@/shared/components/AppLogo.vue'
import AppSpinner from '@/shared/components/AppSpinner.vue'
import TimezoneSelect from '@/shared/components/TimezoneSelect.vue'
import {extractErrorMessage} from '@/shared/utils/error-handler.ts'

const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone)
const autoDetect = ref(false)
const detectingTz = ref(false)
const errors = ref<Record<string, string>>({})
const loading = ref(false)

const passwordMismatch = computed(
    () => confirmPassword.value.length > 0 && confirmPassword.value !== password.value,
)

function validate(): boolean {
  errors.value = {}
  if (name.value.length < 2) errors.value.name = 'Name must be at least 2 characters'
  if (password.value.length < 8) errors.value.password = 'Password must be at least 8 characters'
  else if (!/[a-zA-Z]/.test(password.value) || !/\d/.test(password.value))
    errors.value.password = 'Password must contain a letter and a number'
  if (password.value !== confirmPassword.value)
    errors.value.confirmPassword = 'Passwords do not match'
  return Object.keys(errors.value).length === 0
}

async function submit() {
  if (!validate()) return
  loading.value = true
  try {
    await authApi.register({name: name.value, email: email.value, password: password.value, timezone: timezone.value})
    localStorage.setItem('pendingVerificationEmail', email.value)
    router.push('/verify-email')
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && e.response?.status === 409) errors.value.email = 'An account with this email already exists'
    else errors.value.general = extractErrorMessage(e, 'Registration failed')
  } finally {
    loading.value = false
  }
}

async function detectTimezone() {
  detectingTz.value = true
  try {
    const res = await fetch('https://ipapi.co/timezone/')
    const tz = await res.text()
    const allTimezones: string[] = (Intl as any).supportedValuesOf('timeZone')
    if (allTimezones.includes(tz.trim())) timezone.value = tz.trim()
  } catch {
  } finally {
    detectingTz.value = false
  }
}

function onAutoDetectChange() {
  if (autoDetect.value) detectTimezone()
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <AppLogo variant="light" :size="36"/>
        <span class="auth-logo-text">Feedly<span>Pet</span></span>
      </div>
      <h1 class="auth-title">Create account</h1>
      <p class="auth-subtitle">Start managing your pet's feeding today</p>

      <form @submit.prevent="submit" class="auth-form">
        <div class="field">
          <label>Name</label>
          <input v-model="name" type="text" required minlength="2" maxlength="100" autocomplete="name"
                 placeholder="Your name" :class="{ error: errors.name }"/>
          <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
        </div>

        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" required autocomplete="email" placeholder="you@example.com"
                 :class="{ error: errors.email }"/>
          <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
        </div>

        <div class="field">
          <label>Password</label>
          <input v-model="password" type="password" required minlength="8" autocomplete="new-password"
                 placeholder="••••••••" :class="{ error: errors.password }"/>
          <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
        </div>

        <div class="field">
          <label>Confirm password</label>
          <input v-model="confirmPassword" type="password" required autocomplete="new-password" placeholder="••••••••"
                 :class="{ error: errors.confirmPassword || passwordMismatch }"/>
          <p v-if="passwordMismatch || errors.confirmPassword" class="field-error">
            {{ errors.confirmPassword || 'Passwords do not match' }}
          </p>
        </div>

        <div class="field">
          <div class="tz-label-row">
            <label>Timezone</label>
            <button
                type="button"
                @click="autoDetect = !autoDetect; onAutoDetectChange()"
                class="tz-detect-btn"
                :class="{ active: autoDetect }"
            >
              <AppSpinner v-if="detectingTz"/>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tz-icon">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="2" x2="12" y2="5"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="5" y2="12"/>
                <line x1="19" y1="12" x2="22" y2="12"/>
              </svg>
              {{ detectingTz ? 'Detecting...' : 'Auto-detect' }}
            </button>
          </div>
          <TimezoneSelect v-model="timezone" :disabled="detectingTz"/>
        </div>

        <p v-if="errors.general" class="error-msg">{{ errors.general }}</p>

        <button type="submit" :disabled="loading" class="btn-submit">
          <AppSpinner v-if="loading"/>
          {{ loading ? 'Creating...' : 'Create account' }}
        </button>
      </form>

      <div class="auth-links">
        <RouterLink to="/login" class="primary">Already have an account? <strong>Sign in</strong></RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tz-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tz-detect-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-family: 'Outfit', sans-serif;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  color: #C4875A;
  transition: color 0.2s;
  padding: 0;
}

.tz-detect-btn:hover {
  color: #A0522D;
}

.tz-detect-btn.active {
  color: #A0522D;
}

.tz-icon {
  width: 0.85rem;
  height: 0.85rem;
}
</style>
