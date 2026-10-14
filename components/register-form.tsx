'use client'

import { Button, Card, FieldError, Input, Label, TextField } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/api'
import { homeFor } from '@/lib/user'

type Errors = { name?: string; email?: string; password?: string }

export function RegisterForm() {
    const router = useRouter()
    const queryClient = useQueryClient()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errors, setErrors] = useState<Errors>({})

    const register = useMutation({
        mutationFn: () => api('/auth/register', 'POST', { name: name.trim(), email: email.trim(), password }),
        onSuccess: (data) => {
            queryClient.setQueryData(['user'], data.user)
            router.push(homeFor(data.user))
        },
    })

    function validate() {
        const found: Errors = {}
        if (name.trim() === '') found.name = 'Enter your name.'
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = 'Enter a valid email.'
        if (password.length < 8) found.password = 'Password must be at least 8 characters.'
        if (password.length > 72) found.password = 'Password must be 72 characters or fewer.'
        return found
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const found = validate()
        setErrors(found)
        if (Object.keys(found).length === 0) {
            register.mutate()
        }
    }

    return (
        <Card className="w-full max-w-sm">
            <Card.Header>
                <Card.Title className="text-xl font-bold">Create an account</Card.Title>
            </Card.Header>
            <Card.Content>
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                    <TextField name="name" autoComplete="name" value={name} onChange={setName} isInvalid={Boolean(errors.name)}>
                        <Label>Name</Label>
                        <Input />
                        <FieldError>{errors.name}</FieldError>
                    </TextField>

                    <TextField name="email" type="email" autoComplete="email" value={email} onChange={setEmail} isInvalid={Boolean(errors.email)}>
                        <Label>Email</Label>
                        <Input />
                        <FieldError>{errors.email}</FieldError>
                    </TextField>

                    <TextField name="password" type="password" autoComplete="new-password" value={password} onChange={setPassword} isInvalid={Boolean(errors.password)}>
                        <Label>Password</Label>
                        <Input />
                        <FieldError>{errors.password}</FieldError>
                    </TextField>

                    {register.isError && <p role="alert" className="font-medium text-danger">{register.error.message}</p>}

                    <Button type="submit" className="w-full" isDisabled={register.isPending}>
                        {register.isPending ? 'Creating account...' : 'Create account'}
                    </Button>
                </form>
            </Card.Content>
        </Card>
    )
}
