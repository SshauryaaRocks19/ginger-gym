'use client'

import { Button, Card, Input, Label, TextField } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { CheckInForm } from '@/components/check-in-form'
import { CreateSessionForm } from '@/components/create-session-form'
import { Header } from '@/components/header'
import { SessionBookings } from '@/components/session-bookings'
import { api } from '@/lib/api'
import { formatTime, todayInGym } from '@/lib/format'
import { useRequireUser } from '@/lib/user'

type GymSession = {
    id: string
    startsAt: string
    capacity: number
    seatsRemaining: number
}

export default function AdminPage() {
    const user = useRequireUser('admin')
    const [day, setDay] = useState(todayInGym())
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const sessionsQuery = useQuery({
        queryKey: ['sessions', day],
        queryFn: () => api(`/sessions?date=${day}`),
        refetchInterval: 5000,
    })

    if (!user) return <p className="p-8">Loading...</p>

    return (
        <>
            <Header user={user} />
            <main className="mx-auto w-full max-w-4xl p-4">
                <h1 className="mb-6 text-4xl">Admin</h1>

                <div className="grid gap-6 md:grid-cols-2">
                    <CheckInForm />
                    <CreateSessionForm />
                </div>

                <section className="mt-10">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                        <h2 className="text-2xl font-bold">Sessions</h2>
                        <TextField
                            name="day"
                            type="date"
                            value={day}
                            onChange={(value) => {
                                setDay(value)
                                setSelectedId(null)
                            }}
                        >
                            <Label>Day</Label>
                            <Input />
                        </TextField>
                    </div>

                    {sessionsQuery.isPending ? (
                        <p>Loading sessions...</p>
                    ) : sessionsQuery.isError ? (
                        <p role="alert">{sessionsQuery.error.message}</p>
                    ) : sessionsQuery.data.sessions.length === 0 ? (
                        <p>No sessions on this day. Create one above.</p>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {sessionsQuery.data.sessions.map((session: GymSession) => (
                                <li key={session.id}>
                                    <Card>
                                        <Card.Content className="flex flex-row flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="font-bold">{formatTime(session.startsAt)}</p>
                                                <p>{session.capacity - session.seatsRemaining} of {session.capacity} booked</p>
                                            </div>
                                            <Button
                                                variant={selectedId === session.id ? 'primary' : 'secondary'}
                                                size="sm"
                                                onPress={() => setSelectedId(session.id)}
                                            >
                                                {selectedId === session.id ? 'Showing bookings' : 'View bookings'}
                                            </Button>
                                        </Card.Content>
                                    </Card>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {selectedId && (
                    <section className="mt-6">
                        <SessionBookings sessionId={selectedId} />
                    </section>
                )}
            </main>
        </>
    )
}
