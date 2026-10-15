'use client'

import { Card, Chip } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { formatTime } from '@/lib/format'

type SessionBooking = {
    id: string
    memberName: string
    memberEmail: string
    cancelled: boolean
    checkedInAt: string | null
}

function StatusChip({ booking }: { booking: SessionBooking }) {
    if (booking.cancelled) return <Chip color="danger">Cancelled</Chip>
    if (booking.checkedInAt) return <Chip color="success">Turned up</Chip>
    return <Chip>Not checked in</Chip>
}

export function SessionBookings({ sessionId }: { sessionId: string }) {
    const bookingsQuery = useQuery({
        queryKey: ['session-bookings', sessionId],
        queryFn: () => api(`/sessions/${sessionId}/bookings`),
        refetchInterval: 5000,
    })

    if (bookingsQuery.isPending) return <p>Loading bookings...</p>
    if (bookingsQuery.isError) return <p role="alert">{bookingsQuery.error.message}</p>

    const bookings: SessionBooking[] = bookingsQuery.data.bookings
    const active = bookings.filter((booking) => !booking.cancelled)
    const turnedUp = active.filter((booking) => booking.checkedInAt)

    return (
        <Card>
            <Card.Header>
                <Card.Title className="text-xl font-bold">{formatTime(bookingsQuery.data.session.startsAt)}</Card.Title>
                <Card.Description>{active.length} booked, {turnedUp.length} turned up</Card.Description>
            </Card.Header>
            <Card.Content>
                {bookings.length === 0 ? (
                    <p>No bookings for this session yet.</p>
                ) : (
                    <ul className="flex flex-col divide-y divide-foreground/10">
                        {bookings.map((booking) => (
                            <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                <div>
                                    <p className="font-semibold">{booking.memberName}</p>
                                    <p className="text-sm text-muted">{booking.memberEmail}</p>
                                </div>
                                <StatusChip booking={booking} />
                            </li>
                        ))}
                    </ul>
                )}
            </Card.Content>
        </Card>
    )
}
