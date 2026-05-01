import {onBeforeUnmount} from 'vue'

export function useDebounce(fn: () => void, delay = 300) {
    let timer: ReturnType<typeof setTimeout>
    const debounced = () => {
        clearTimeout(timer)
        timer = setTimeout(fn, delay)
    }
    onBeforeUnmount(() => clearTimeout(timer))
    return debounced
}
