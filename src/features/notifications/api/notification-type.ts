export const NotificationType = {
    FeedingSuccess: 'FEEDING_SUCCESS',
    FeedingFailed: 'FEEDING_FAILED',
    LowFoodLevel: 'LOW_FOOD_LEVEL',
    DeviceStatus: 'DEVICE_STATUS',
} as const

export type NotificationType = typeof NotificationType[keyof typeof NotificationType]
