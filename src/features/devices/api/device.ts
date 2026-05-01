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