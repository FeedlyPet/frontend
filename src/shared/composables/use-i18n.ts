import {ref, computed} from 'vue'

type Lang = 'en' | 'uk'

const translations = {
    en: {
        dashboard: 'Dashboard',
        pets: 'Pets',
        devices: 'Devices',
        alerts: 'Alerts',
        profile: 'Profile',
        notifications: 'Notifications',
        logout: 'Log out',
        viewAll: 'View all →',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        confirm: 'Confirm',
    },
    uk: {
        dashboard: 'Головна',
        pets: 'Улюбленці',
        devices: 'Пристрої',
        alerts: 'Сповіщення',
        profile: 'Профіль',
        notifications: 'Сповіщення',
        logout: 'Вийти',
        viewAll: 'Всі →',
        cancel: 'Скасувати',
        save: 'Зберегти',
        delete: 'Видалити',
        edit: 'Редагувати',
        add: 'Додати',
        confirm: 'Підтвердити',
    },
}

const lang = ref<Lang>((localStorage.getItem('lang') as Lang) ?? 'en')

export function useI18n() {
    const t = computed(() => translations[lang.value])

    function setLang(l: Lang) {
        lang.value = l
        localStorage.setItem('lang', l)
    }

    function toggle() {
        setLang(lang.value === 'en' ? 'uk' : 'en')
    }

    return {lang, t, toggle, setLang}
}
