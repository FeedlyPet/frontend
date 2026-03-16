import api from './apiClient.ts'
import type { PaginatedResponse } from './petsApi.ts'

export interface Device {
  id: string
  deviceId: string
  name: string
  isOnline: boolean
  lastSeen?: string
  petId?: string
  createdAt: string
}

export interface CreateDeviceDto {
  deviceId: string
  name: string
  petId: string
}

export interface UpdateDeviceDto {
  name?: string
  petId?: string
}

export const devicesApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<Device>>('/devices', { params }).then((r) => r.data),

  getOne: (id: string) =>
    api.get<Device>(`/devices/${id}`).then((r) => r.data),

  create: (dto: CreateDeviceDto) =>
    api.post<Device>('/devices', dto).then((r) => r.data),

  update: (id: string, dto: UpdateDeviceDto) =>
    api.patch<Device>(`/devices/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/devices/${id}`).then((r) => r.data),

  regeneratePassword: (id: string) =>
    api.post(`/devices/${id}/regenerate-password`).then((r) => r.data),

  manualFeed: (id: string, portionSize: number) =>
    api.post(`/devices/${id}/feed`, { portionSize }).then((r) => r.data),
}
