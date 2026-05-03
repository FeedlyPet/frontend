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
        // devices
        online: 'Online',
        offline: 'Offline',
        details: 'Details →',
        noPetLinked: 'No pet linked',
        feedNow: 'Feed now',
        noDevices: 'No devices yet',
        addDevice: 'Add device',
        registerDevice: 'Register device',
        register: 'Register',
        registering: 'Registering...',
        editDevice: 'Edit device',
        deleteDevice: 'Delete',
        saving: 'Saving...',
        deleting: 'Deleting...',
        regenerating: 'Regenerating...',
        regenerate: 'Regenerate',
        foodLevel: 'Food level',
        noDataAvailable: 'No data available',
        portionsLeft: 'portions left',
        measuredAt: 'Measured',
        manualFeeding: 'Manual feeding',
        deviceOffline: 'Device is offline — manual feeding unavailable',
        schedules: 'Schedules',
        schedulesHint: 'Set up automatic feeding schedules for this device.',
        recentFeedings: 'Recent feedings',
        noFeedingEvents: 'No feeding events yet',
        fullHistory: 'Full history →',
        mqttSettings: 'MQTT settings',
        mqttNote: "Regenerating the password will disconnect the device until it's reconfigured.",
        regenerateMqtt: 'Regenerate MQTT password',
        linkedPet: 'Linked pet',
        unlinkPet: '— Unlink pet —',
        noResults: 'No results for',
        searchDevices: 'Search devices...',
        hardwareId: 'Hardware Device ID *',
        hardwareIdHint: 'Found on the label of your device',
        location: 'Location',
        linkToPet: 'Link to pet',
        noPet: '— No pet —',
        name: 'Name',
        manage: 'Manage →',
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
        // devices
        online: 'Онлайн',
        offline: 'Офлайн',
        details: 'Детальніше →',
        noPetLinked: 'Без тварини',
        feedNow: 'Годувати',
        noDevices: 'Немає пристроїв',
        addDevice: 'Додати пристрій',
        registerDevice: 'Реєстрація пристрою',
        register: 'Зареєструвати',
        registering: 'Реєстрація...',
        editDevice: 'Редагувати пристрій',
        deleteDevice: 'Видалити',
        saving: 'Збереження...',
        deleting: 'Видалення...',
        regenerating: 'Оновлення...',
        regenerate: 'Оновити',
        foodLevel: 'Рівень корму',
        noDataAvailable: 'Немає даних',
        portionsLeft: 'порцій залишилось',
        measuredAt: 'Виміряно',
        manualFeeding: 'Ручне годування',
        deviceOffline: 'Пристрій офлайн — ручне годування недоступне',
        schedules: 'Розклади',
        schedulesHint: 'Налаштуйте автоматичне годування для цього пристрою.',
        recentFeedings: 'Останні годування',
        noFeedingEvents: 'Подій годування ще немає',
        fullHistory: 'Вся історія →',
        mqttSettings: 'Налаштування MQTT',
        mqttNote: 'Оновлення пароля відключить пристрій до повторного налаштування.',
        regenerateMqtt: 'Оновити пароль MQTT',
        linkedPet: 'Прив\'язана тварина',
        unlinkPet: '— Відв\'язати тварину —',
        noResults: 'Немає результатів для',
        searchDevices: 'Пошук пристроїв...',
        hardwareId: 'ID пристрою *',
        hardwareIdHint: 'Знаходиться на наклейці пристрою',
        location: 'Місце розташування',
        linkToPet: 'Прив\'язати тварину',
        noPet: '— Без тварини —',
        name: 'Назва',
        manage: 'Керувати →',
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
