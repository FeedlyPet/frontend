import api from '@/shared/api/api.client.ts'
import type {PaginatedResponse} from '@/shared/api/paginated-response.ts'
import type {PaginationParams} from "@/shared/api/pagination-params.ts";
import type {Device} from "@/features/devices/api/device.ts";
import type {FoodLevel} from "@/features/devices/api/food-level.ts";
import type {FeedingEvent} from "@/features/devices/api/feeding-event.ts";
import type {CreateDeviceDto} from "@/features/devices/api/create-device.dto.ts";
import type {UpdateDeviceDto} from "@/features/devices/api/update-device.dto.ts";

export const devicesApi = {
    getAll: (params?: PaginationParams) =>
        api.get<PaginatedResponse<Device>>('/devices', {params}).then((r) => r.data),

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
        api.get<FoodLevel[]>(`/devices/${id}/food-levels`, {params}).then((r) => r.data),

    getEvents: (id: string, params?: {
        page?: number;
        limit?: number;
        type?: string;
        success?: boolean;
        startDate?: string;
        endDate?: string
    }) =>
        api.get<PaginatedResponse<FeedingEvent>>(`/devices/${id}/events`, {params}).then((r) => r.data),

    regeneratePassword: (id: string) =>
        api.post<{ mqttPassword: string }>(`/devices/${id}/regenerate-password`).then((r) => r.data),

    manualFeed: (id: string, portionSize: number) =>
        api.post(`/devices/${id}/feed`, {portionSize}).then((r) => r.data),
}
