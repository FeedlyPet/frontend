import {ref, watch} from 'vue'

type Theme = 'light' | 'dark'

const theme = ref<Theme>((localStorage.getItem('theme') as Theme) ?? 'light')

function applyTheme(t: Theme) {
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('theme', t)
}

applyTheme(theme.value)

watch(theme, applyTheme)

export function useTheme() {
    return {
        theme,
        toggle() {
            theme.value = theme.value === 'light' ? 'dark' : 'light'
        },
    }
}
