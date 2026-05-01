import type {Day} from '@/features/schedules/api/day.ts'

export interface CreateScheduleDto {
    feedingTime: string
    portionSize: number
    isActive: boolean
    daysOfWeek: Day[]
}