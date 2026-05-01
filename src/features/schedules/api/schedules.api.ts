import api from '@/shared/api/api.client.ts'
import type {PaginatedResponse} from '@/shared/api/paginated-response.ts'
import type {Schedule} from '@/features/schedules/api/schedule.ts'
import type {CreateScheduleDto} from '@/features/schedules/api/create-schedule.dto.ts'
import type {UpdateScheduleDto} from '@/features/schedules/api/update-schedule.dto.ts'

export const schedulesApi = {
    getAll: (deviceId: string, params?: { isActive?: boolean; sortBy?: string; sortOrder?: string }) =>
        api.get<PaginatedResponse<Schedule>>(`/devices/${deviceId}/schedules`, {params}).then((r) => r.data),

    create: (deviceId: string, dto: CreateScheduleDto) =>
        api.post<Schedule>(`/devices/${deviceId}/schedules`, dto).then((r) => r.data),

    update: (id: string, dto: UpdateScheduleDto) =>
        api.patch<Schedule>(`/schedules/${id}`, dto).then((r) => r.data),

    toggle: (id: string) =>
        api.patch<Schedule>(`/schedules/${id}/toggle`).then((r) => r.data),

    remove: (id: string) =>
        api.delete(`/schedules/${id}`).then((r) => r.data),
}
