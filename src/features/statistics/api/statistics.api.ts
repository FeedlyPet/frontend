import api from '@/shared/api/api.client.ts'
import type {StatisticsResponse} from "@/features/statistics/api/statistics-response.ts";

export type StatisticsPeriod = 'week' | 'month' | 'year'

export const statisticsApi = {
    getDeviceStats: (deviceId: string, period: StatisticsPeriod) =>
        api.get<StatisticsResponse>(`/statistics/feeding/${deviceId}`, {params: {period}}).then((r) => r.data),
}
