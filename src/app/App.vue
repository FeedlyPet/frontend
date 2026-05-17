<script setup lang="ts">
import {onMounted, watch} from 'vue'
import {RouterView, useRouter} from 'vue-router'
import AppToast from '@/shared/components/AppToast.vue'
import {useSocket} from '@/shared/composables/use-socket.ts'

const socket = useSocket()
const router = useRouter()

function connectIfLoggedIn() {
    const token = localStorage.getItem('accessToken')
    if (token) {
        socket.connect(token)
    }
}

onMounted(connectIfLoggedIn)

watch(() => router.currentRoute.value.path, connectIfLoggedIn)
</script>

<template>
  <RouterView/>
  <AppToast/>
</template>
