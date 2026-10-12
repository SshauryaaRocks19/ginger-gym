import { jwt } from '@elysiajs/jwt'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { db } from './db'
import { ApiError } from './errors'
import { users } from './schema'

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set')
}

const ONE_DAY_IN_SECONDS = 60 * 60 * 24

export const sessionCookie = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_DAY_IN_SECONDS,
} as const

async function findSignedInUser(userId: string | undefined) {
    if (!userId) {
        throw new ApiError(401, 'UNAUTHENTICATED', 'Please log in.')
    }

    const [user] = await db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, userId))

    // token is valid but the account no longer exists
    if (!user) {
        throw new ApiError(401, 'UNAUTHENTICATED', 'Please log in.')
    }

    return user
}

export const auth = new Elysia({ name: 'auth' })
    .use(jwt({ name: 'jwt', secret: jwtSecret, exp: '1d' }))
    .macro({
        signedIn: {
            async resolve({ jwt, cookie: { session } }) {
                const payload = await jwt.verify(session.value as string | undefined)
                const user = await findSignedInUser(payload ? payload.sub : undefined)
                return { user }
            },
        },
        adminOnly: {
            async resolve({ jwt, cookie: { session } }) {
                const payload = await jwt.verify(session.value as string | undefined)
                const user = await findSignedInUser(payload ? payload.sub : undefined)
                if (user.role !== 'admin') {
                    throw new ApiError(403, 'FORBIDDEN', 'Only admins can do this.')
                }
                return { user }
            },
        },
    })
