import { ref } from 'vue'
import { notificationsApi } from '../api/notifications.api.ts'

const unreadCount = ref(0)

async function fetchUnreadCount() {
  try {
    unreadCount.value = await notificationsApi.getUnreadCount()
  } catch {
  }
}

function decrement(by = 1) {
  unreadCount.value = Math.max(0, unreadCount.value - by)
}

function reset() {
  unreadCount.value = 0
}

export function useUnreadCount() {
  return { unreadCount, fetchUnreadCount, decrement, reset }
}
