'use client'

import { Button, Card, FieldError, Input, Label, TextField } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/api'
import { homeFor } from '@/lib/user'

type Errors = {email?: string; password?: string }

export function LoginForm() {
    const router = useRouter()
    const queryClient = useQueryClient()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errors, setErrors] = useState<Errors>({})

    const login = useMutation({
        mutationFn: () => api('/auth/login', 'POST', { email: email.trim(), password }),
        onSuccess: (data) => {
            queryClient.setQueryData(['user'], data.user)
            router.push(homeFor(data.user))
        },
    })

    function validate() {
        const found: Errors = {}
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = 'Enter a valid email.'
        if (password ==='') found.password = 'Enter your password.'
        return found
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const found = validate()
        setErrors(found)
        if (Object.keys(found).length === 0) {
            login.mutate()
        }
    }

    return (
        <Card className="w-full max-w-sm">
            <Card.Header>
                <Card.Title className="text-xl font-bold">Welcome back</Card.Title>
            </Card.Header>
            <Card.Content>
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

                    <TextField name="email" type="email" autoComplete="email" value={email} onChange={setEmail} isInvalid={Boolean(errors.email)}>
                        <Label>Email</Label>
                        <Input />
                        <FieldError>{errors.email}</FieldError>
                    </TextField>

                    <TextField name="password" type="password" autoComplete="current-password" value={password} onChange={setPassword} isInvalid={Boolean(errors.password)}>
                        <Label>Password</Label>
                        <Input />
                        <FieldError>{errors.password}</FieldError>
                    </TextField>

                    {login.isError && <p role="alert" className="font-medium text-danger">{login.error.message}</p>}

                    <Button type="submit" className="w-full" isDisabled={login.isPending}>
                        {login.isPending ? 'Logging in...' : 'Log in'}
                    </Button>
                </form>
            </Card.Content>
        </Card>
    )
}
