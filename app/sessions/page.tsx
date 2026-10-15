'use client'

import { Button, Card, Chip, Label, Meter, toast } from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Header } from '@/components/header'
import { api } from '@/lib/api'
import { formatTime } from '@/lib/format'
import { useRequireUser } from '@/lib/user'

type GymSession = {
    id: string
    startsAt: string
    capacity: number
    seatsRemaining: number
    myBookingId: string | null
    myStatus: 'booked' | 'waitlisted' | null
}

type SessionsData = { sessions: GymSession[] }

export default function SessionsPage() {
    const user = useRequireUser('member')
    const queryClient = useQueryClient()

    // refetch every 5 seconds so seat counts stay live
    const sessionsQuery = useQuery({
        queryKey: ['sessions'],
        queryFn: () => api('/sessions'),
        refetchInterval: 5000,
    })

    function refresh() {
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
    }

    const book = useMutation({
        mutationFn: (sessionId: string) => api('/bookings', 'POST', { sessionId }),
        // update the seat count before the server answers, and remember the old list in case we need to undo it
        onMutate: async (sessionId) => {
            await queryClient.cancelQueries({ queryKey: ['sessions'] })
            const previous = queryClient.getQueryData<SessionsData>(['sessions'])
            queryClient.setQueryData<SessionsData>(['sessions'], (old) => old && {
                sessions: old.sessions.map((session) =>
                    session.id === sessionId
                        ? { ...session, seatsRemaining: session.seatsRemaining - 1, myStatus: 'booked' }
                        : session
                ),
            })
            return { previous }
        },
        onError: (error, sessionId, context) => {
            queryClient.setQueryData(['sessions'], context?.previous)
            toast.danger(error.message)
        },
        onSuccess: () => toast.success('Booked! Your check-in code is in My bookings.'),
        onSettled: refresh,
    })

    const joinWaitlist = useMutation({
        mutationFn: (sessionId: string) => api(`/sessions/${sessionId}/waitlist`, 'POST'),
        onSuccess: (data) => toast.success(`You're number ${data.position} on the waitlist.`),
        onError: (error) => toast.danger(error.message),
        onSettled: refresh,
    })

    const leaveWaitlist = useMutation({
        mutationFn: (sessionId: string) => api(`/sessions/${sessionId}/waitlist`, 'DELETE'),
        onSuccess: () => toast.success('You left the waitlist.'),
        onError: (error) => toast.danger(error.message),
        onSettled: refresh,
    })

    const busy = book.isPending || joinWaitlist.isPending || leaveWaitlist.isPending

    if (!user) return <p className="p-8">Loading...</p>

    return (
        <>
            <Header user={user} />
            <main className="mx-auto w-full max-w-4xl p-4">
                <h1 className="mb-6 text-4xl">Sessions</h1>
                {sessionsQuery.isPending ? (
                    <p>Loading sessions...</p>
                ) : sessionsQuery.isError ? (
                    <p role="alert">{sessionsQuery.error.message}</p>
                ) : sessionsQuery.data.sessions.length === 0 ? (
                    <p>No upcoming sessions yet. Check back soon.</p>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2">
                        {sessionsQuery.data.sessions.map((session: GymSession) => {
                            const isFull = session.seatsRemaining <= 0

                            return (
                                <li key={session.id}>
                                    <Card className="h-full">
                                        <Card.Header>
                                            <Card.Title className="text-lg font-bold">{formatTime(session.startsAt)}</Card.Title>
                                        </Card.Header>
                                        <Card.Content className="flex flex-col gap-4">
                                            <Meter
                                                value={session.seatsRemaining}
                                                maxValue={session.capacity}
                                                valueLabel={isFull ? 'Full' : `${session.seatsRemaining} of ${session.capacity}`}
                                            >
                                                <Label>Spots left</Label>
                                                <Meter.Output />
                                                <Meter.Track>
                                                    <Meter.Fill />
                                                </Meter.Track>
                                            </Meter>

                                            {session.myStatus === 'booked' ? (
                                                <div className="flex items-center gap-3">
                                                    <Chip color="success">Booked</Chip>
                                                    <Link href="/bookings" className="text-sm underline">See your code</Link>
                                                </div>
                                            ) : session.myStatus === 'waitlisted' ? (
                                                <div className="flex items-center gap-3">
                                                    <Chip color="warning">On waitlist</Chip>
                                                    <Button variant="secondary" size="sm" onPress={() => leaveWaitlist.mutate(session.id)} isDisabled={busy}>
                                                        Leave
                                                    </Button>
                                                </div>
                                            ) : isFull ? (
                                                <Button variant="secondary" onPress={() => joinWaitlist.mutate(session.id)} isDisabled={busy}>
                                                    Join waitlist
                                                </Button>
                                            ) : (
                                                <Button onPress={() => book.mutate(session.id)} isDisabled={busy}>
                                                    Book
                                                </Button>
                                            )}
                                        </Card.Content>
                                    </Card>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </main>
        </>
    )
}
