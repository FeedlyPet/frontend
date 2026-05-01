import type {DailyBreakdown} from "@/features/statistics/api/daily-breakdown.ts";

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