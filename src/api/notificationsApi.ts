import api from './apiClient.ts'
import type { PaginatedResponse } from './petsApi.ts'

export interface Notification {
  id: string
  type: 'FEEDING_SUCCESS' | 'FEEDING_FAILED' | 'LOW_FOOD_LEVEL' | 'DEVICE_STATUS'
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface NotificationSettings {
  feedingSuccess: boolean
  feedingFailed: boolean
  lowFoodLevel: boolean
  deviceStatus: boolean
}

export const notificationsApi = {
  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data.count),

  getAll: (params?: { page?: number; limit?: number; isRead?: boolean; type?: string }) =>
    api.get<PaginatedResponse<Notification>>('/notifications', { params }).then((r) => r.data),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.patch('/notifications/read-all').then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/notifications/${id}`).then((r) => r.data),

  getSettings: () =>
    api.get<NotificationSettings>('/notifications/settings').then((r) => r.data),

  updateSettings: (dto: Partial<NotificationSettings>) =>
    api.patch<NotificationSettings>('/notifications/settings', dto).then((r) => r.data),
}
