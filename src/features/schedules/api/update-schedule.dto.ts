import type {Day} from '@/features/schedules/api/day.ts'

export interface UpdateScheduleDto {
    feedingTime?: string
    portionSize?: number
    isActive?: boolean
    daysOfWeek?: Day[]
}