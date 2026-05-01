export function getCurrentUser(): { name: string; email: string } | null {
    const stored = localStorage.getItem('user')
    if (!stored) return null
    try {
        return JSON.parse(stored)
    } catch {
        return null
    }
}
