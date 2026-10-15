'use client'

import { Header } from '@/components/header'
import { useRequireUser } from '@/lib/user'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatTime } from '@/lib/format'
import { Button, Card, Chip, toast } from '@heroui/react'
import Link from 'next/link'

type Booking = {
    id: string
    sessionId: string
    startsAt: string
    checkInCode: string
    checkedInAt: string | null
}

type WaitlistEntry = {
    sessionId: string
    startsAt: string
    position: number
}

export default function BookingsPage() {
    const user = useRequireUser('member')
    const bookingsQuery = useQuery({
        queryKey: ['my-bookings'],
        queryFn: () => api('/bookings/mine')
    })
    const queryClient = useQueryClient()

    function refresh() {
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
    }

    const cancel = useMutation({
        mutationFn: (id: string) => api(`/bookings/${id}/cancel`, 'POST'),
        onSuccess: () => {
            toast.success('Booking cancelled.')
            refresh()
        },
        onError: (error) => toast.danger(error.message)
    })

    const leaveWaitlist = useMutation({
        mutationFn: (sessionId: string) => api(`/sessions/${sessionId}/waitlist`, 'DELETE'),
        onSuccess: () => {
            toast.success('You left the waitlist.')
            refresh()
        },
        onError: (error) => toast.danger(error.message)
    })

    if (!user) return <p className="p-8">Loading...</p>

    return (
        <>
            <Header user={user} />
            <main className="mx-auto w-full max-w-4xl p-4">
                <h1 className="mb-6 text-4xl">My bookings</h1>
                {bookingsQuery.isPending ? (
                    <p>Loading your bookings...</p>
                ) : bookingsQuery.isError ? (
                    <p role="alert">{bookingsQuery.error.message}</p>
                ) : (
                    <>
                        {bookingsQuery.data.bookings.length === 0 ? (
                            <div className="flex flex-col items-start gap-2">
                                <p>You have no bookings yet.</p>
                                <Link href="/sessions" className="font-semibold underline">Browse sessions</Link>
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {bookingsQuery.data.bookings.map((booking: Booking) => (
                                    <li key={booking.id}>
                                        <Card>
                                            <Card.Content className="flex flex-row flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-lg font-bold">{formatTime(booking.startsAt)}</p>
                                                    <p className="text-sm text-muted">Check-in code</p>
                                                    <p className="font-mono text-xl font-bold tracking-widest">{booking.checkInCode}</p>
                                                </div>
                                                {booking.checkedInAt ? (
                                                    <Chip color="success">Checked in</Chip>
                                                ) : (
                                                    <Button
                                                        variant="danger-soft"
                                                        size="sm"
                                                        onPress={() => confirm('Cancel this booking?') && cancel.mutate(booking.id)}
                                                        isDisabled={cancel.isPending}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                            </Card.Content>
                                        </Card>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {bookingsQuery.data.waitlist.length > 0 && (
                            <section className="mt-10">
                                <h2 className="mb-3 text-2xl font-bold">Waitlist</h2>
                                <ul className="flex flex-col gap-3">
                                    {bookingsQuery.data.waitlist.map((entry: WaitlistEntry) => (
                                        <li key={entry.sessionId}>
                                            <Card>
                                                <Card.Content className="flex flex-row flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <p className="font-bold">{formatTime(entry.startsAt)}</p>
                                                        <p>You are number {entry.position} in line. You get a seat automatically if someone cancels.</p>
                                                    </div>
                                                    <Button variant="secondary" size="sm" onPress={() => leaveWaitlist.mutate(entry.sessionId)} isDisabled={leaveWaitlist.isPending}>
                                                        Leave
                                                    </Button>
                                                </Card.Content>
                                            </Card>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </>
                )}
            </main>
        </>
    )
}
