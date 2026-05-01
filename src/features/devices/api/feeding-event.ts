import type {FeedingEventType} from '@/features/devices/api/feeding-event-type.ts'

export interface FeedingEvent {
    id: string
    deviceId: string
    deviceName?: string
    type: FeedingEventType
    portionSize: number
    success: boolean
    errorMessage?: string
    createdAt: string
}