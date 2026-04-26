import api from './apiClient.ts'

export interface DailyBreakdown {
  date: string
  feedings: number
  food: number
}

export interface StatisticsResponse {
  totalFeedings: number
  totalFood: number
  averagePortion: number
  successfulFeedings: number
  failedFeedings: number
  automaticFeedings: number
  manualFeedings: number
  period: { start: string; end: string }
  dailyBreakdown: DailyBreakdown[]
  comparison: {
    previousFeedings: number
    previousFood: number
    feedingsChange: number
    foodChange: number
  }
}

export type StatisticsPeriod = 'week' | 'month' | 'year'

export const statisticsApi = {
  getDeviceStats: (deviceId: string, period: StatisticsPeriod) =>
    api.get<StatisticsResponse>(`/statistics/feeding/${deviceId}`, { params: { period } }).then((r) => r.data),
}
