import type {Day} from '@/features/schedules/api/day.ts';

export interface Schedule {
    id: string
    deviceId: string
    feedingTime: string
    portionSize: number
    isActive: boolean
    daysOfWeek: Day[]
    createdAt: string
    updatedAt: string
}