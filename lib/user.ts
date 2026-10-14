import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { api } from './api'

export type User = {
    id: string
    name: string
    email: string
    role: 'member' | 'admin'
}

export function homeFor(user: User) {
    return user.role === 'admin' ? '/admin' : '/sessions'
}

export function useUser() {
    return useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const data = await api('/auth/me')
                return data.user as User
            } catch {
                return null
            }
        },
    })
}

export function useRequireUser(role: User['role']) {
    const router = useRouter()
    const { data: user, isPending } = useUser()

    useEffect(() => {
        if (isPending) return
        if (!user) {
            router.replace('/login')
        } else if (user.role !== role) {
            router.replace(homeFor(user))
        }
    }, [user, isPending, role, router])

    return user?.role === role ? user : null
}
