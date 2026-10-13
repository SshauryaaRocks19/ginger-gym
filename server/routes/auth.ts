import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth, sessionCookie } from '../auth'
import { db } from '../db'
import { ApiError, isUniqueViolation } from '../errors'
import { users } from '../schema'

const BCRYPT_COST = 10

const publicUserFields = {
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
}
    
function cleanEmail(email: string) {
    return email.trim().toLowerCase()
}

export const authRoutes = new Elysia({ prefix: '/auth' })
    .use(auth)
    .post('/register', async ({ body, jwt, cookie: { session }, set }) => {
        const passwordHash = await bcrypt.hash(body.password, BCRYPT_COST)

        let user
        try {
            // role is left out on purpose, so it always falls back to 'member'
            const [created] = await db
                .insert(users)
                .values({ name: body.name.trim(), email: cleanEmail(body.email), passwordHash })
                .returning(publicUserFields)
            user = created
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists.')
            }
            throw error
        }

        session.set({ value: await jwt.sign({ sub: user.id }), ...sessionCookie })
        set.status = 201
        return { user }
    }, {
        body: t.Object({
            name: t.String({ minLength: 1, maxLength: 100 }),
            email: t.String({ format: 'email' }),
            password: t.String({ minLength: 8, maxLength: 72 }),
        }),
    })
    .post('/login', async ({ body, jwt, cookie: { session } }) => {
        const [found] = await db
            .select()
            .from(users)
            .where(eq(users.email, cleanEmail(body.email)))

        // same error for unknown email and wrong password, so nobody can probe which emails exist
        const passwordMatches = found ? await bcrypt.compare(body.password, found.passwordHash) : false
        if (!found || !passwordMatches) {
            throw new ApiError(401, 'INVALID_CREDENTIALS', 'Wrong email or password.')
        }

        session.set({ value: await jwt.sign({ sub: found.id }), ...sessionCookie })
        return {
            user: { id: found.id, name: found.name, email: found.email, role: found.role },
        }
    }, {
        body: t.Object({
            email: t.String({ format: 'email' }),
            password: t.String({ minLength: 1 }),
        }),
    })
    .post('/logout', ({ cookie: { session } }) => {
        session.remove()
        // a 204 must have no body; Elysia's set.status = 204 still sends one on Node
        return new Response(null, { status: 204 })
    })
    .get('/me', ({ user }) => ({ user }), { signedIn: true })
