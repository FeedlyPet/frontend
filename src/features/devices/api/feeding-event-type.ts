export const FeedingEventType = {
    Manual: 'manual',
    Automatic: 'automatic',
} as const

export type FeedingEventType = typeof FeedingEventType[keyof typeof FeedingEventType]
