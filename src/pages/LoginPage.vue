<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../api/authApi.ts'
import AppLogo from '../components/AppLogo.vue'
import AppSpinner from '../components/AppSpinner.vue'

const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }
  loading.value = true
  try {
    const data = await authApi.login({ email: email.value, password: password.value })
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    router.push('/dashboard')
  } catch (e: unknown) {
    const err = e as any
    error.value = err.response?.status === 401 ? 'Invalid email or password' : (err.response?.data?.message ?? 'Login failed')
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
      <h1 class="auth-title">Welcome back</h1>
      <p class="auth-subtitle">Sign in to manage your pet's feeding</p>

      <form @submit.prevent="submit" class="auth-form">
        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" required autocomplete="email" placeholder="you@example.com" />
        </div>
        <div class="field">
          <label>Password</label>
          <input v-model="password" type="password" required autocomplete="current-password" minlength="8" placeholder="••••••••" />
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" :disabled="loading" class="btn-submit">
          <AppSpinner v-if="loading" />
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <div class="auth-links">
        <RouterLink to="/forgot-password">Forgot password?</RouterLink>
        <RouterLink to="/register" class="primary">Don't have an account? <strong>Sign up</strong></RouterLink>
      </div>
    </div>
  </div>
</template>
