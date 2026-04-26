import api from './apiClient.ts'
import type { PaginatedResponse } from './petsApi.ts'

export interface Schedule {
  id: string
  deviceId: string
  feedingTime: string
  portionSize: number
  isActive: boolean
  daysOfWeek: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateScheduleDto {
  feedingTime: string
  portionSize: number
  isActive: boolean
  daysOfWeek: string[]
}

export interface UpdateScheduleDto {
  feedingTime?: string
  portionSize?: number
  isActive?: boolean
  daysOfWeek?: string[]
}

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

export const schedulesApi = {
  getAll: (deviceId: string, params?: { isActive?: boolean; sortBy?: string; sortOrder?: string }) =>
    api.get<PaginatedResponse<Schedule>>(`/devices/${deviceId}/schedules`, { params }).then((r) => r.data),

  create: (deviceId: string, dto: CreateScheduleDto) =>
    api.post<Schedule>(`/devices/${deviceId}/schedules`, dto).then((r) => r.data),

  update: (id: string, dto: UpdateScheduleDto) =>
    api.patch<Schedule>(`/schedules/${id}`, dto).then((r) => r.data),

  toggle: (id: string) =>
    api.patch<Schedule>(`/schedules/${id}/toggle`).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/schedules/${id}`).then((r) => r.data),
}
