import {ref, onBeforeUnmount} from 'vue'
import {devicesApi} from '../api/devices.api.ts'
import {useToast} from '@/shared/composables/use-toast.ts'
import {useSocket} from '@/shared/composables/use-socket.ts'
import type {Device} from "@/features/devices/api/device.ts";

interface FeedingResultEvent {
    deviceId: string
    deviceName: string
    portionSize: number
    success: boolean
    errorMessage?: string
    timestamp: string
}

export function useFeedModal() {
    const toast = useToast()
    const socket = useSocket()

    const feedModal = ref(false)
    const feedDevice = ref<Device | null>(null)
    const portionSize = ref(100)
    const feedLoading = ref(false)
    const feedPending = ref(false)
    const feedSuccess = ref(false)
    const feedError = ref<string | null>(null)
    let feedCloseTimer: ReturnType<typeof setTimeout> | null = null
    let feedTimeoutTimer: ReturnType<typeof setTimeout> | null = null

    onBeforeUnmount(() => {
        if (feedCloseTimer) clearTimeout(feedCloseTimer)
        if (feedTimeoutTimer) clearTimeout(feedTimeoutTimer)
    })

    function openFeedModal(device: Device) {
        feedDevice.value = device
        portionSize.value = 100
        feedSuccess.value = false
        feedPending.value = false
        feedError.value = null
        feedModal.value = true
    }

    function closeFeedModal() {
        if (feedCloseTimer) clearTimeout(feedCloseTimer)
        if (feedTimeoutTimer) clearTimeout(feedTimeoutTimer)
        feedModal.value = false
        feedDevice.value = null
        feedPending.value = false
        feedSuccess.value = false
        feedError.value = null
    }

    async function confirmFeed() {
        if (!feedDevice.value) return
        feedLoading.value = true
        feedError.value = null

        try {
            await devicesApi.manualFeed(feedDevice.value.id, portionSize.value)
        } catch {
            toast.error('Failed to send feed command')
            feedLoading.value = false
            closeFeedModal()
            return
        }

        feedLoading.value = false
        feedPending.value = true

        const deviceId = feedDevice.value.id

        function onResult(data: FeedingResultEvent) {
            if (data.deviceId !== deviceId) return
            socket.off('feeding:result', onResult)
            if (feedTimeoutTimer) clearTimeout(feedTimeoutTimer)

            feedPending.value = false
            if (data.success) {
                feedSuccess.value = true
                feedCloseTimer = setTimeout(closeFeedModal, 2000)
            } else {
                feedError.value = data.errorMessage ?? 'Feeding failed'
                feedCloseTimer = setTimeout(closeFeedModal, 3000)
            }
        }

        socket.on('feeding:result', onResult)

        feedTimeoutTimer = setTimeout(() => {
            socket.off('feeding:result', onResult)
            feedPending.value = false
            feedError.value = 'No response from device'
            feedCloseTimer = setTimeout(closeFeedModal, 2000)
        }, 15000)
    }

    return {
        feedModal,
        feedDevice,
        portionSize,
        feedLoading,
        feedPending,
        feedSuccess,
        feedError,
        openFeedModal,
        closeFeedModal,
        confirmFeed,
    }
}
