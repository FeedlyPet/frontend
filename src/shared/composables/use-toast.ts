import {reactive} from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
    id: number
    type: ToastType
    message: string
}

let nextId = 0
const toasts = reactive<Toast[]>([])

function add(type: ToastType, message: string) {
    const id = nextId++
    toasts.push({id, type, message})
    setTimeout(() => remove(id), 4000)
}

function remove(id: number) {
    const idx = toasts.findIndex(t => t.id === id)
    if (idx !== -1) toasts.splice(idx, 1)
}

export function useToast() {
    return {
        toasts,
        success: (msg: string) => add('success', msg),
        error: (msg: string) => add('error', msg),
        warning: (msg: string) => add('warning', msg),
        info: (msg: string) => add('info', msg),
        remove,
    }
}
