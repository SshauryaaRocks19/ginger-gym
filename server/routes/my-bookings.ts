import { and, asc, eq, inArray } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { auth } from '../auth'
import { db } from '../db'
import { bookings, sessions, waitlist } from '../schema'

export const myBookingRoutes = new Elysia({ prefix: '/bookings' })
    .use(auth)
    .get('/mine', async ({ user }) => {
        // only ever the caller's own rows: user.id comes from the token, never from the request
        const myBookings = await db
            .select({
                id: bookings.id,
                sessionId: bookings.sessionId,
                startsAt: sessions.startsAt,
                checkInCode: bookings.checkInCode,
                checkedInAt: bookings.checkedInAt,
            })
            .from(bookings)
            .innerJoin(sessions, eq(sessions.id, bookings.sessionId))
            .where(and(eq(bookings.userId, user.id), eq(bookings.cancelled, false)))
            .orderBy(asc(sessions.startsAt))

        const myEntries = await db
            .select({ sessionId: waitlist.sessionId, startsAt: sessions.startsAt })
            .from(waitlist)
            .innerJoin(sessions, eq(sessions.id, waitlist.sessionId))
            .where(eq(waitlist.userId, user.id))
            .orderBy(asc(sessions.startsAt))

        // position = how many people joined that session's waitlist before me, plus one
        const sessionIds = myEntries.map((entry) => entry.sessionId)
        const queues = sessionIds.length === 0 ? [] : await db
            .select({ sessionId: waitlist.sessionId, userId: waitlist.userId })
            .from(waitlist)
            .where(inArray(waitlist.sessionId, sessionIds))
            .orderBy(asc(waitlist.createdAt))

        const myWaitlist = myEntries.map((entry) => {
            const queue = queues.filter((row) => row.sessionId === entry.sessionId)
            const position = queue.findIndex((row) => row.userId === user.id) + 1
            return { ...entry, position }
        })

        return { bookings: myBookings, waitlist: myWaitlist }
    }, {
        signedIn: true,
    })
