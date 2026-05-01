export function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    if (h < 48) return 'yesterday'
    return `${Math.floor(h / 24)}d ago`
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})
}

export function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})
}

export function foodLevelColor(level: number): string {
    if (level < 20) return '#e74c3c'
    if (level < 40) return '#f39c12'
    return '#27ae60'
}

export const speciesIcon: Record<string, string> = {
    dog: '🐕',
    cat: '🐈',
    bird: '🐦',
    other: '🐾',
}
