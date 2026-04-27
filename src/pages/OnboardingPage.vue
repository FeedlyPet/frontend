<template>
  <div class="onboarding">
    <button v-if="currentSlide < slides.length - 1" class="skip-btn" @click="goToLogin">
      Skip
    </button>

    <div class="slides-container">
      <transition :name="transitionName" mode="out-in">
        <div :key="currentSlide" class="slide">
          <div class="slide-icon">
          <AppLogo v-if="currentSlide === 0" variant="dark" :size="80" />
          <span v-else class="slide-emoji">{{ slides[currentSlide].icon }}</span>
        </div>
          <h1 class="slide-title">{{ slides[currentSlide].title }}</h1>
          <p class="slide-subtitle">{{ slides[currentSlide].subtitle }}</p>
        </div>
      </transition>
    </div>

    <div class="dots">
      <button
        v-for="(_, i) in slides"
        :key="i"
        class="dot"
        :class="{ active: i === currentSlide }"
        @click="goToSlide(i)"
      />
    </div>

    <div class="actions">
      <template v-if="currentSlide < slides.length - 1">
        <button class="btn-primary" @click="next">Next →</button>
      </template>
      <template v-else>
        <router-link to="/login" class="btn-secondary">Sign In</router-link>
        <router-link to="/register" class="btn-primary">Sign Up</router-link>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLogo from '../components/AppLogo.vue'

const router = useRouter()

const slides = [
  { icon: '🐾', title: 'Welcome to FeedlyPet!', subtitle: 'Smart feeder for your pet' },
  { icon: '📅', title: 'Feeding Schedule', subtitle: 'Set the time and portion sizes — the device does the rest' },
  { icon: '📡', title: 'Online Monitoring', subtitle: 'Track food levels in real time' },
  { icon: '🔔', title: 'Always Informed', subtitle: 'Get notifications about every feeding and low food levels' },
]

const currentSlide = ref(0)
const transitionName = ref('slide-left')

function goToSlide(index: number) {
  transitionName.value = index > currentSlide.value ? 'slide-left' : 'slide-right'
  currentSlide.value = index
}

function next() {
  if (currentSlide.value < slides.length - 1) {
    transitionName.value = 'slide-left'
    currentSlide.value++
  }
}

function goToLogin() {
  router.push('/login')
}
</script>

<style scoped>
.onboarding {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  background: linear-gradient(145deg, #2C1208 0%, #7B3A18 60%, #A0522D 100%);
  color: #F5EDE0;
}

.skip-btn {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(245, 237, 224, 0.15);
  color: #F5EDE0;
  border: 1px solid rgba(245, 237, 224, 0.3);
  padding: 0.4rem 1rem;
  border-radius: 2rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: 'Outfit', sans-serif;
  transition: background 0.2s;
}

.skip-btn:hover {
  background: rgba(245, 237, 224, 0.25);
}

.slides-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 480px;
  overflow: hidden;
}

.slide {
  text-align: center;
  padding: 2rem;
  width: 100%;
}

.slide-icon {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
}

.slide-emoji {
  font-size: 5rem;
}

.slide-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.75rem;
  margin-bottom: 1rem;
  line-height: 1.2;
  color: #F5EDE0;
}

.slide-subtitle {
  font-family: 'Outfit', sans-serif;
  font-size: 1.05rem;
  opacity: 0.8;
  line-height: 1.6;
  color: #C4875A;
}

.dots {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(245, 237, 224, 0.3);
  border: none;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  padding: 0;
}

.dot.active {
  background: #C4875A;
  transform: scale(1.3);
}

.actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.btn-primary {
  background: #C4875A;
  color: #2C1208;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 2rem;
  font-size: 1rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s, transform 0.15s;
}

.btn-primary:hover {
  background: #A0522D;
  color: #F5EDE0;
  transform: translateY(-2px);
}

.btn-secondary {
  background: rgba(245, 237, 224, 0.15);
  color: #F5EDE0;
  border: 1px solid rgba(245, 237, 224, 0.4);
  padding: 0.75rem 2rem;
  border-radius: 2rem;
  font-size: 1rem;
  font-weight: 600;
  font-family: 'Outfit', sans-serif;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s;
}

.btn-secondary:hover {
  background: rgba(245, 237, 224, 0.25);
}

.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.35s ease;
}
.slide-left-enter-from { opacity: 0; transform: translateX(60px); }
.slide-left-leave-to { opacity: 0; transform: translateX(-60px); }
.slide-right-enter-from { opacity: 0; transform: translateX(-60px); }
.slide-right-leave-to { opacity: 0; transform: translateX(60px); }
</style>
