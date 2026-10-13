import { Elysia } from 'elysia'
import { ApiError } from './errors'
import { sql } from 'drizzle-orm'
import { db } from './db'
import { authRoutes } from './routes/auth'
import { sessionRoutes } from './routes/sessions'
import { bookingRoutes } from './routes/bookings'
import { myBookingRoutes } from './routes/my-bookings'
import { waitlistRoutes } from './routes/waitlist'

export const app = new Elysia({ prefix: '/api' })
    .onError(({ code, error, set }) => {
        if (error instanceof ApiError) {
            set.status = error.status
            return { error: { code: error.code, message: error.message } }
        }

        if (code === 'NOT_FOUND') {
            set.status = 404;
            return { error: { code: 'NOT_FOUND', message: 'Route not found.' } }
        }

        if (code === 'VALIDATION') {
            set.status = 422
            return {
                error: {
                    code: 'VALIDATION',
                    message: 'Some fields are invalid.',
                    details: error.all.map((issue) => ({
                        field: issue.path.slice(1),
                        message: issue.summary ?? issue.message,
                    })),
                },
            }
        }

        if (code === 'PARSE') {
            set.status = 400
            return { error: { code: 'BAD_REQUEST', message: 'Request body is not valid JSON.' } }
        }

        console.error(error);
        set.status = 500
        return { error: { code: 'INTERNAL', message: 'Something went wrong. Try again.' } }
    })
    .get('/health', async () => {
        const [row] = await db.execute(sql`select now() as now`)
        return { ok: true, databaseTime: row.now }
    })
    .use(authRoutes)
    .use(sessionRoutes)
    .use(bookingRoutes)
    .use(myBookingRoutes)
    .use(waitlistRoutes)

