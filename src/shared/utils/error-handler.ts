import axios from 'axios'

export function extractErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message
        if (Array.isArray(msg)) return msg[0]
        return msg ?? fallback
    }
    return fallback
}
