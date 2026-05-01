<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {authApi} from '../api/auth.api.ts'
import AppLogo from '@/shared/components/AppLogo.vue'
import AppSpinner from '@/shared/components/AppSpinner.vue'
import {useToast} from '@/shared/composables/use-toast.ts'

const toast = useToast()

const route = useRoute()
const router = useRouter()

const status = ref<'waiting' | 'loading' | 'success' | 'error'>('waiting')
const errorMsg = ref('')
const registeredEmail = ref('')
const resendEmail = ref('')
const cooldown = ref(0)
const countdown = ref(3)

let cooldownTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  const token = route.query.token as string
  if (token) await verifyToken(token)
  const stored = localStorage.getItem('pendingVerificationEmail')
  if (stored) {
    registeredEmail.value = stored;
    resendEmail.value = stored
  }
})

async function verifyToken(token: string) {
  status.value = 'loading'
  try {
    await authApi.verifyEmail(token)
    status.value = 'success'
    const t = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(t);
        router.push('/login')
      }
    }, 1000)
  } catch (e: unknown) {
    status.value = 'error'
    errorMsg.value = (e as any)?.response?.data?.message ?? 'Invalid or expired token'
  }
}

async function resend() {
  if (!resendEmail.value.trim()) return
  try {
    await authApi.resendVerification(resendEmail.value.trim())
    startCooldown()
    toast.success('Verification email sent')
  } catch {
    toast.error('Failed to resend verification email')
  }
}

function startCooldown() {
  cooldown.value = 60
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0) clearInterval(cooldownTimer!)
  }, 1000)
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card text-center">
      <div class="auth-logo">
        <AppLogo variant="light" :size="36"/>
        <span class="auth-logo-text">Feedly<span>Pet</span></span>
      </div>

      <div v-if="status === 'loading'" class="state-block">
        <AppSpinner class="spinner-lg"/>
        <p class="state-text">Verifying email...</p>
      </div>

      <div v-else-if="status === 'success'" class="state-block">
        <div class="state-emoji">✅</div>
        <h2 class="auth-title">Email verified!</h2>
        <p class="auth-subtitle">Redirecting in {{ countdown }}s...</p>
        <RouterLink to="/login" class="btn-submit" style="text-decoration:none; margin-top:1rem;">Sign in now
        </RouterLink>
      </div>

      <div v-else-if="status === 'error'" class="state-block">
        <div class="state-emoji">❌</div>
        <h2 class="auth-title">Verification failed</h2>
        <p class="state-text error">{{ errorMsg }}</p>
        <div class="resend-block">
          <input v-model="resendEmail" type="email" placeholder="Your email"/>
          <button :disabled="cooldown > 0" @click="resend" class="btn-submit">
            {{ cooldown > 0 ? `Resend in ${cooldown}s` : 'Send new link' }}
          </button>
        </div>
      </div>

      <div v-else class="state-block">
        <div class="state-emoji">📧</div>
        <h2 class="auth-title">Check your email</h2>
        <p class="auth-subtitle">
          We sent a verification link to
          <strong v-if="registeredEmail">{{ registeredEmail }}</strong>.
          Click the link to activate your account.
        </p>
        <div class="resend-block">
          <p class="resend-label">Didn't receive the email?</p>
          <input v-model="resendEmail" type="email" placeholder="Your email"/>
          <button :disabled="cooldown > 0 || !resendEmail" @click="resend" class="btn-secondary">
            {{ cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.state-emoji {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.state-text {
  font-size: 0.9rem;
  color: #7B3A18;
}

.state-text.error {
  color: #c0392b;
}

.spinner-lg {
  width: 2.5rem !important;
  height: 2.5rem !important;
  color: #A0522D;
  margin-bottom: 0.5rem;
}

.resend-block {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  border-top: 1px solid #E0D3C0;
  padding-top: 1rem;
}

.resend-label {
  font-size: 0.8rem;
  color: #C4875A;
}

.resend-block input {
  padding: 0.65rem 0.9rem;
  border: 1.5px solid #E0D3C0;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-family: 'Outfit', sans-serif;
  color: #2C1208;
  background: #F5EDE0;
  outline: none;
}

.resend-block input:focus {
  border-color: #A0522D;
  background: #fff;
}

.btn-secondary {
  padding: 0.7rem;
  background: #F5EDE0;
  color: #2C1208;
  border: 1.5px solid #E0D3C0;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  border-color: #A0522D;
  color: #A0522D;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
