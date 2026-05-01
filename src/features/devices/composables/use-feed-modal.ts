import {ref, onBeforeUnmount} from 'vue'
import {devicesApi} from '../api/devices.api.ts'
import {useToast} from '@/shared/composables/use-toast.ts'
import type {Device} from "@/features/devices/api/device.ts";

export function useFeedModal() {
    const toast = useToast()

    const feedModal = ref(false)
    const feedDevice = ref<Device | null>(null)
    const portionSize = ref(100)
    const feedLoading = ref(false)
    const feedSuccess = ref(false)
    let feedCloseTimer: ReturnType<typeof setTimeout> | null = null

    onBeforeUnmount(() => {
        if (feedCloseTimer) clearTimeout(feedCloseTimer)
    })

    function openFeedModal(device: Device) {
        feedDevice.value = device
        portionSize.value = 100
        feedSuccess.value = false
        feedModal.value = true
    }

    function closeFeedModal() {
        if (feedCloseTimer) clearTimeout(feedCloseTimer)
        feedModal.value = false
        feedDevice.value = null
    }

    async function confirmFeed() {
        if (!feedDevice.value) return
        feedLoading.value = true
        try {
            await devicesApi.manualFeed(feedDevice.value.id, portionSize.value)
            feedSuccess.value = true
            feedCloseTimer = setTimeout(closeFeedModal, 1500)
        } catch {
            toast.error('Failed to send feed command')
            closeFeedModal()
        } finally {
            feedLoading.value = false
        }
    }

    return {
        feedModal,
        feedDevice,
        portionSize,
        feedLoading,
        feedSuccess,
        openFeedModal,
        closeFeedModal,
        confirmFeed,
    }
}
