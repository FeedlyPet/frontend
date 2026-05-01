<script setup lang="ts">
import {ref} from 'vue'
import {authApi} from '../api/auth.api.ts'
import AppLogo from '@/shared/components/AppLogo.vue'
import AppSpinner from '@/shared/components/AppSpinner.vue'

const email = ref('')
const loading = ref(false)
const submitted = ref(false)

async function submit() {
  loading.value = true
  try {
    await authApi.forgotPassword(email.value)
  } catch {
  } finally {
    loading.value = false
    submitted.value = true
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <AppLogo variant="light" :size="36"/>
        <span class="auth-logo-text">Feedly<span>Pet</span></span>
      </div>

      <div v-if="submitted" class="text-center">
        <div class="success-icon">📬</div>
        <h2 class="auth-title">Check your inbox</h2>
        <p class="auth-subtitle">If an account with that email exists, we've sent password reset instructions.</p>
        <RouterLink to="/login" class="btn-submit" style="text-decoration:none; margin-top: 1.5rem;">Back to sign in
        </RouterLink>
      </div>

      <template v-else>
        <h1 class="auth-title">Forgot password?</h1>
        <p class="auth-subtitle">Enter your email and we'll send reset instructions.</p>

        <form @submit.prevent="submit" class="auth-form">
          <div class="field">
            <label>Email</label>
            <input v-model="email" type="email" required autocomplete="email" placeholder="you@example.com"/>
          </div>

          <button type="submit" :disabled="loading" class="btn-submit">
            <AppSpinner v-if="loading"/>
            {{ loading ? 'Sending...' : 'Send reset link' }}
          </button>
        </form>

        <div class="auth-links">
          <RouterLink to="/login">← Back to sign in</RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>
