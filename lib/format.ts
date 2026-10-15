const GYM_TIME_ZONE = 'Asia/Kolkata'

export function formatTime(iso: string) {
    return new Date(iso).toLocaleString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: GYM_TIME_ZONE,
    })
}

// 'en-CA' happens to format dates as YYYY-MM-DD, which is what the API wants
export function todayInGym() {
    return new Date().toLocaleDateString('en-CA', { timeZone: GYM_TIME_ZONE })
}
