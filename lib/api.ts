export class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
        super(message)
        this.status = status
    }
}

export async function api(path: string, method = 'GET', body?: unknown) {
    const response = await fetch('/api' + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined, // why do i keep forgetting i have to stringify this bruh hell no
    })

    if (response.status === 204) {
        return null
    }

    const data = await response.json()
    if (!response.ok) {
        throw new ApiError(response.status, data.error.message)
    }
    return data
}
