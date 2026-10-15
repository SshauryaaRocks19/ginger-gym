'use client'

import { Button, Card, FieldError, Input, Label, TextField, toast } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'

export function CheckInForm() {
    const queryClient = useQueryClient()
    const [code, setCode] = useState('')
    const [codeError, setCodeError] = useState('')

    const checkIn = useMutation({
        mutationFn: () => api('/check-ins', 'POST', { code }),
        onSuccess: (data) => {
            toast.success(`${data.checkIn.memberName} is checked in.`)
            setCode('')
            queryClient.invalidateQueries({ queryKey: ['session-bookings'] })
        },
    })

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (code.trim() === '') {
            setCodeError('Enter a check-in code.')
            return
        }
        setCodeError('')
        checkIn.mutate()
    }

    return (
        <Card>
            <Card.Header>
                <Card.Title className="text-xl font-bold">Check someone in</Card.Title>
                <Card.Description>Type the code from the member&apos;s booking.</Card.Description>
            </Card.Header>
            <Card.Content>
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                    <TextField name="code" value={code} onChange={setCode} isInvalid={Boolean(codeError)}>
                        <Label>Check-in code</Label>
                        <Input className="uppercase" placeholder="ABC234" />
                        <FieldError>{codeError}</FieldError>
                    </TextField>

                    {checkIn.isError && <p role="alert" className="font-medium text-danger">{checkIn.error.message}</p>}

                    <Button type="submit" isDisabled={checkIn.isPending}>
                        {checkIn.isPending ? 'Checking in...' : 'Check in'}
                    </Button>
                </form>
            </Card.Content>
        </Card>
    )
}
