import { and, eq, isNull } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../auth'
import { db } from '../db'
import { ApiError } from '../errors'
import { bookings, sessions, users } from '../schema'

const ONE_HOUR_IN_MS = 60 * 60 * 1000

export const checkInRoutes = new Elysia({ prefix: '/check-ins' })
    .use(auth)
    .post('/', async ({ body }) => {
        // people type codes in lowercase or with stray spaces
        const code = body.code.trim().toUpperCase()

        const [booking] = await db
            .select({
                id: bookings.id,
                cancelled: bookings.cancelled,
                checkedInAt: bookings.checkedInAt,
                sessionStartsAt: sessions.startsAt,
                memberName: users.name,
                memberEmail: users.email,
            })
            .from(bookings)
            .innerJoin(sessions, eq(sessions.id, bookings.sessionId))
            .innerJoin(users, eq(users.id, bookings.userId))
            .where(eq(bookings.checkInCode, code))

        if (!booking) {
            throw new ApiError(404, 'CODE_NOT_FOUND', 'No booking has this code.')
        }
        if (booking.cancelled) {
            throw new ApiError(409, 'BOOKING_CANCELLED', `This booking was cancelled (${booking.memberName}).`)
        }
        if (booking.checkedInAt) {
            throw new ApiError(409, 'ALREADY_CHECKED_IN', `${booking.memberName} is already checked in.`)
        }

        const now = new Date()
        const sessionEndsAt = new Date(booking.sessionStartsAt.getTime() + ONE_HOUR_IN_MS)
        if (now < booking.sessionStartsAt || now >= sessionEndsAt) {
            throw new ApiError(409, 'OUTSIDE_SESSION_HOUR', 'Codes only work during their session.')
        }

        // "checkedInAt is null" in the where clause means two admins typing the same code
        // at the same moment can't both succeed: only one update finds the row still empty
        const [updated] = await db
            .update(bookings)
            .set({ checkedInAt: now })
            .where(and(eq(bookings.id, booking.id), isNull(bookings.checkedInAt)))
            .returning({ checkedInAt: bookings.checkedInAt })

        if (!updated) {
            throw new ApiError(409, 'ALREADY_CHECKED_IN', `${booking.memberName} is already checked in.`)
        }

        return {
            checkIn: {
                bookingId: booking.id,
                memberName: booking.memberName,
                memberEmail: booking.memberEmail,
                sessionStartsAt: booking.sessionStartsAt,
                checkedInAt: updated.checkedInAt,
            },
        }
    }, {
        adminOnly: true,
        body: t.Object({
            code: t.String({ minLength: 1, maxLength: 20 }),
        }),
    })
