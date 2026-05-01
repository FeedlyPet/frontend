import type {NotificationType} from '@/features/notifications/api/notification-type.ts'

export interface Notification {
    id: string
    type: NotificationType
    title: string
    message: string
    isRead: boolean
    createdAt: string
}