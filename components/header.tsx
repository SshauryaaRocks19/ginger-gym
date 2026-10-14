'use client'

import { Button } from '@heroui/react'
import { SignOut } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { homeFor, type User } from '@/lib/user'

const memberLinks = [
    { href: '/sessions', label: 'Sessions' },
    { href: '/bookings', label: 'My bookings' },
]

export function Header({ user }: { user: User }) {
    const router = useRouter()
    const pathname = usePathname()
    const queryClient = useQueryClient()

    const logout = useMutation({
        mutationFn: () => api('/auth/logout', 'POST'),
        onSuccess: () => {
            queryClient.clear()
            router.push('/login')
        },
    })

    return (
        <header className="border-b-[3px] border-foreground bg-accent">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 p-4">
                <Link href={homeFor(user)} className="font-heading text-2xl">🫚 Ginger Gym</Link>

                {user.role === 'member' && (
                    <nav className="flex gap-5 font-bold">
                        {memberLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={pathname === link.href ? 'page' : undefined}
                                className="py-2 underline-offset-[6px] hover:underline aria-[current=page]:underline aria-[current=page]:decoration-[3px]"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                )}

                <Button className="ml-auto" variant="secondary" size="sm" onPress={() => logout.mutate()} isDisabled={logout.isPending}>
                    <SignOut weight="bold" />
                    Log out
                </Button>
            </div>
        </header>
    )
}
