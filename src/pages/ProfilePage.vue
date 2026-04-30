<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usersApi } from '../api/usersApi.ts'
import AppSpinner from '../components/AppSpinner.vue'

const profile = ref({ name: '', email: '', timezone: '' })
const loading = ref(true)
const savingProfile = ref(false)
const savingPassword = ref(false)
const profileSuccess = ref('')
const profileError = ref('')
const passwordSuccess = ref('')
const passwordError = ref('')

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const timezones = (Intl as any).supportedValuesOf('timeZone') as string[]

onMounted(async () => {
  try {
    const data = await usersApi.getProfile()
    profile.value.name = (data as any).name ?? `${(data as any).firstName ?? ''} ${(data as any).lastName ?? ''}`.trim()
    profile.value.email = data.email
    profile.value.timezone = (data as any).timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  } finally {
    loading.value = false
  }
})

async function saveProfile() {
  profileError.value = ''
  profileSuccess.value = ''
  savingProfile.value = true
  try {
    await usersApi.updateProfile({ name: profile.value.name, email: profile.value.email, timezone: profile.value.timezone } as any)
    profileSuccess.value = 'Profile saved'
    const stored = localStorage.getItem('user')
    if (stored) {
      const u = JSON.parse(stored)
      u.name = profile.value.name
      u.email = profile.value.email
      localStorage.setItem('user', JSON.stringify(u))
    }
  } catch (e: unknown) {
    profileError.value = (e as any)?.response?.data?.message ?? 'Failed to save'
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match'
    return
  }
  if (newPassword.value.length < 8 || !/[a-zA-Z]/.test(newPassword.value) || !/\d/.test(newPassword.value)) {
    passwordError.value = 'Password must be at least 8 characters and contain a letter and a number'
    return
  }
  savingPassword.value = true
  try {
    await usersApi.changePassword({ currentPassword: currentPassword.value, newPassword: newPassword.value })
    passwordSuccess.value = 'Password changed'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e: unknown) {
    const err = e as any
    passwordError.value = err.response?.status === 401 ? 'Incorrect current password' : (err.response?.data?.message ?? 'Failed to change password')
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="profile-page">

    <div v-if="loading" class="loading">Loading...</div>

    <template v-else>
      <!-- Personal info -->
      <section class="card">
        <h2 class="card-title">Personal information</h2>

        <div class="field">
          <label>Name</label>
          <input v-model="profile.name" type="text" placeholder="Your name" />
        </div>
        <div class="field">
          <label>Email</label>
          <input v-model="profile.email" type="email" placeholder="you@example.com" />
        </div>
        <div class="field">
          <label>Timezone</label>
          <select v-model="profile.timezone">
            <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
          </select>
        </div>

        <p v-if="profileError" class="msg msg--error">{{ profileError }}</p>
        <p v-if="profileSuccess" class="msg msg--success">{{ profileSuccess }}</p>

        <button @click="saveProfile" :disabled="savingProfile" class="btn-primary">
          <AppSpinner v-if="savingProfile" />
          {{ savingProfile ? 'Saving...' : 'Save changes' }}
        </button>
      </section>

      <!-- Change password -->
      <section class="card">
        <h2 class="card-title">Change password</h2>

        <div class="field">
          <label>Current password</label>
          <input v-model="currentPassword" type="password" autocomplete="current-password" placeholder="••••••••" />
        </div>
        <div class="field">
          <label>New password</label>
          <input v-model="newPassword" type="password" autocomplete="new-password" placeholder="••••••••" />
        </div>
        <div class="field">
          <label>Confirm new password</label>
          <input v-model="confirmPassword" type="password" autocomplete="new-password" placeholder="••••••••" />
        </div>

        <p v-if="passwordError" class="msg msg--error">{{ passwordError }}</p>
        <p v-if="passwordSuccess" class="msg msg--success">{{ passwordSuccess }}</p>

        <button @click="savePassword" :disabled="savingPassword" class="btn-primary">
          <AppSpinner v-if="savingPassword" />
          {{ savingPassword ? 'Saving...' : 'Change password' }}
        </button>
      </section>
    </template>

  </div>
</template>

<style scoped>
.profile-page {
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading { color: #A0522D; font-size: 0.9rem; }

.card {
  background: #fff;
  border-radius: 1.25rem;
  padding: 1.75rem;
  box-shadow: 0 2px 16px rgba(44,18,8,0.07);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
  color: #2C1208;
  margin-bottom: 0.25rem;
}

.msg { font-size: 0.85rem; padding: 0.5rem 0.75rem; border-radius: 0.6rem; }
.msg--error { color: #c0392b; background: #fdf0ee; }
.msg--success { color: #27ae60; background: #edfaf3; }

.btn-primary {
  padding: 0.75rem;
  background: #2C1208;
  color: #F5EDE0;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.btn-primary:hover:not(:disabled) { background: #7B3A18; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
