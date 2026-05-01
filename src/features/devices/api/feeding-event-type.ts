export const FeedingEventType = {
    Manual: 'MANUAL',
    Scheduled: 'SCHEDULED',
} as const

export type FeedingEventType = typeof FeedingEventType[keyof typeof FeedingEventType]
