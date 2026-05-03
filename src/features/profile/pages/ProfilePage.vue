<script setup lang="ts">
import {ref, onMounted} from 'vue'
import axios from 'axios'
import {usersApi} from '../api/users.api.ts'
import AppSpinner from '@/shared/components/AppSpinner.vue'
import TimezoneSelect from '@/shared/components/TimezoneSelect.vue'
import {useToast} from '@/shared/composables/use-toast.ts'
import {useI18n} from '@/shared/composables/use-i18n.ts'
import {extractErrorMessage} from '@/shared/utils/error-handler.ts'

const toast = useToast()
const {t} = useI18n()

const profile = ref({name: '', email: '', timezone: ''})
const loading = ref(true)
const savingProfile = ref(false)
const savingPassword = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

onMounted(async () => {
  try {
    const data = await usersApi.getProfile()
    profile.value.name = data.name
    profile.value.email = data.email
    profile.value.timezone = data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    toast.error(t.value.failedToLoadProfile)
  } finally {
    loading.value = false
  }
})

async function saveProfile() {
  savingProfile.value = true
  try {
    await usersApi.updateProfile({
      name: profile.value.name,
      email: profile.value.email,
      timezone: profile.value.timezone
    })
    toast.success(t.value.profileSaved)
    const stored = localStorage.getItem('user')
    if (stored) {
      const u = JSON.parse(stored)
      u.name = profile.value.name
      u.email = profile.value.email
      localStorage.setItem('user', JSON.stringify(u))
    }
  } catch (e: unknown) {
    toast.error(extractErrorMessage(e, t.value.failedToSaveProfile))
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  if (newPassword.value !== confirmPassword.value) {
    toast.error(t.value.passwordsDoNotMatch)
    return
  }
  if (newPassword.value.length < 8 || !/[a-zA-Z]/.test(newPassword.value) || !/\d/.test(newPassword.value)) {
    toast.error(t.value.passwordTooWeak)
    return
  }
  savingPassword.value = true
  try {
    await usersApi.changePassword({currentPassword: currentPassword.value, newPassword: newPassword.value})
    toast.success(t.value.passwordChanged)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e: unknown) {
    toast.error(axios.isAxiosError(e) && e.response?.status === 401
        ? t.value.incorrectPassword
        : extractErrorMessage(e, t.value.failedToChangePassword))
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="profile-page">

    <div v-if="loading" class="loading">{{ t.loading }}</div>

    <template v-else>
      <section class="card">
        <h2 class="card-title">{{ t.personalInfo }}</h2>

        <div class="field">
          <label>{{ t.nameField2 }}</label>
          <input v-model="profile.name" type="text" placeholder="Your name"/>
        </div>
        <div class="field">
          <label>{{ t.emailField }}</label>
          <input v-model="profile.email" type="email" placeholder="you@example.com"/>
        </div>
        <div class="field">
          <label>{{ t.timezoneField }}</label>
          <TimezoneSelect v-model="profile.timezone" :disabled="savingProfile"/>
        </div>

        <button @click="saveProfile" :disabled="savingProfile" class="btn-primary">
          <AppSpinner v-if="savingProfile"/>
          {{ savingProfile ? t.saving : t.saveChanges }}
        </button>
      </section>

      <section class="card">
        <h2 class="card-title">{{ t.changePassword }}</h2>

        <div class="field">
          <label>{{ t.currentPassword }}</label>
          <input v-model="currentPassword" type="password" autocomplete="current-password" placeholder="••••••••"/>
        </div>
        <div class="field">
          <label>{{ t.newPassword }}</label>
          <input v-model="newPassword" type="password" autocomplete="new-password" placeholder="••••••••"/>
        </div>
        <div class="field">
          <label>{{ t.confirmNewPassword }}</label>
          <input v-model="confirmPassword" type="password" autocomplete="new-password" placeholder="••••••••"/>
        </div>

        <button @click="savePassword" :disabled="savingPassword" class="btn-primary">
          <AppSpinner v-if="savingPassword"/>
          {{ savingPassword ? t.saving : t.changePassword }}
        </button>
      </section>
    </template>

  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.card {
  background: var(--bg-card);
  border-radius: 1.25rem;
  padding: 1rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 480px) {
  .card {
    padding: 1.25rem;
  }
}

.card-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.btn-primary {
  padding: 0.75rem;
  background: var(--brown-dark);
  color: var(--bg-page);
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
}

.btn-primary:hover:not(:disabled) {
  background: var(--brown-mid);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
