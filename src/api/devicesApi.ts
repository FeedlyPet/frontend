import api from './apiClient.ts'
import type { PaginatedResponse } from './petsApi.ts'

export interface Device {
  id: string
  deviceId: string
  name: string
  location?: string
  isOnline: boolean
  lastSeen?: string
  petId?: string
  pet?: { id: string; name: string; species: string }
  createdAt: string
}

export interface FoodLevel {
  level: number
  measuredAt: string
}

export interface FeedingEvent {
  id: string
  deviceId: string
  deviceName?: string
  type: 'MANUAL' | 'SCHEDULED'
  portionSize: number
  success: boolean
  errorMessage?: string
  createdAt: string
}

export interface CreateDeviceDto {
  deviceId: string
  name: string
  location?: string
  petId?: string
}

export interface UpdateDeviceDto {
  name?: string
  location?: string
  petId?: string | null
}

export const devicesApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) =>
    api.get<PaginatedResponse<Device>>('/devices', { params }).then((r) => r.data),

  getOne: (id: string) =>
    api.get<Device>(`/devices/${id}`).then((r) => r.data),

  create: (dto: CreateDeviceDto) =>
    api.post<Device & { mqttPassword: string }>('/devices', dto).then((r) => r.data),

  update: (id: string, dto: UpdateDeviceDto) =>
    api.patch<Device>(`/devices/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/devices/${id}`).then((r) => r.data),

  getFoodLevel: (id: string) =>
    api.get<FoodLevel>(`/devices/${id}/food-level`).then((r) => r.data),

  getFoodLevels: (id: string, params?: { limit?: number; sortOrder?: string }) =>
    api.get<FoodLevel[]>(`/devices/${id}/food-levels`, { params }).then((r) => r.data),

  getEvents: (id: string, params?: { page?: number; limit?: number; type?: string; success?: boolean; startDate?: string; endDate?: string }) =>
    api.get<PaginatedResponse<FeedingEvent>>(`/devices/${id}/events`, { params }).then((r) => r.data),

  regeneratePassword: (id: string) =>
    api.post<{ mqttPassword: string }>(`/devices/${id}/regenerate-password`).then((r) => r.data),

  manualFeed: (id: string, portionSize: number) =>
    api.post(`/devices/${id}/feed`, { portionSize }).then((r) => r.data),
}
