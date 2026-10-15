'use client'

import { Button, Card, FieldError, Input, Label, ListBox, Select, TextField, toast } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'

// the gym is open 6:00 to 22:00, so the last session starts at 21:00
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6)

export function CreateSessionForm() {
    const queryClient = useQueryClient()
    const [date, setDate] = useState('')
    const [hour, setHour] = useState('7')
    const [dateError, setDateError] = useState('')

    const create = useMutation({
        mutationFn: () => api('/sessions', 'POST', { date, hour: Number(hour) }),
        onSuccess: () => {
            toast.success('Session created.')
            setDate('')
            queryClient.invalidateQueries({ queryKey: ['sessions'] })
        },
    })

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (date === '') {
            setDateError('Pick a date.')
            return
        }
        setDateError('')
        create.mutate()
    }

    return (
        <Card>
            <Card.Header>
                <Card.Title className="text-xl font-bold">New session</Card.Title>
                <Card.Description>Sessions last one hour and have 20 seats.</Card.Description>
            </Card.Header>
            <Card.Content>
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                    <TextField name="date" type="date" value={date} onChange={setDate} isInvalid={Boolean(dateError)}>
                        <Label>Date</Label>
                        <Input />
                        <FieldError>{dateError}</FieldError>
                    </TextField>

                    <Select value={hour} onChange={(value) => setHour(String(value))}>
                        <Label>Start time (gym time)</Label>
                        <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                            <ListBox>
                                {HOURS.map((h) => (
                                    <ListBox.Item key={h} id={String(h)} textValue={`${h}:00`}>
                                        {String(h).padStart(2, '0')}:00
                                        <ListBox.ItemIndicator />
                                    </ListBox.Item>
                                ))}
                            </ListBox>
                        </Select.Popover>
                    </Select>

                    {create.isError && <p role="alert" className="font-medium text-danger">{create.error.message}</p>}

                    <Button type="submit" isDisabled={create.isPending}>
                        {create.isPending ? 'Creating...' : 'Create session'}
                    </Button>
                </form>
            </Card.Content>
        </Card>
    )
}
