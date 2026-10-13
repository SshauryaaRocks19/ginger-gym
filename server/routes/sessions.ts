import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../auth'
import { db } from '../db'
import { ApiError, isUniqueViolation } from '../errors'
import { bookings, sessions, users, waitlist } from '../schema'

// the gym is in one place, so "a date" always means a date in this time zone
const GYM_TIME_ZONE = 'Asia/Kolkata'
// India has no daylight saving, so its offset from UTC never changes
const GYM_UTC_OFFSET = '+05:30'
const SESSION_CAPACITY = 20

// the 'date' format only checks the shape, so 2026-02-30 gets through; JavaScript would quietly turn it into March 2
function assertRealDate(date: string) {
    const isRealDate = new Date(`${date}T00:00:00Z`).toISOString().startsWith(date)
    if (!isRealDate) {
        throw new ApiError(422, 'INVALID_DATE', 'That date does not exist.')
    }
}

export const sessionRoutes = new Elysia({ prefix: '/sessions' })
    .use(auth)
    .get('/', async ({ query, user }) => {
        if (query.date) {
            assertRealDate(query.date)
        }

        const dateFilter = query.date
            ? sql`(${sessions.startsAt} at time zone ${GYM_TIME_ZONE})::date = ${query.date}::date`
            : gt(sessions.startsAt, sql`now()`)

        // each session joined with its active bookings, then counted per session
        const rows = await db
            .select({
                id: sessions.id,
                startsAt: sessions.startsAt,
                capacity: sessions.capacity,
                bookedCount: sql<number>`count(${bookings.id})::int`,
            })
            .from(sessions)
            .leftJoin(bookings, and(eq(bookings.sessionId, sessions.id), eq(bookings.cancelled, false)))
            .where(dateFilter)
            .groupBy(sessions.id)
            .orderBy(asc(sessions.startsAt))

        if (rows.length === 0) {
            return { sessions: [] }
        }

        const sessionIds = rows.map((row) => row.id)

        const myBookings = await db
            .select({ id: bookings.id, sessionId: bookings.sessionId })
            .from(bookings)
            .where(and(
                eq(bookings.userId, user.id),
                eq(bookings.cancelled, false),
                inArray(bookings.sessionId, sessionIds),
            ))

        const myWaitlistEntries = await db
            .select({ sessionId: waitlist.sessionId })
            .from(waitlist)
            .where(and(eq(waitlist.userId, user.id), inArray(waitlist.sessionId, sessionIds)))

        const myBookingIdBySession = new Map(myBookings.map((booking) => [booking.sessionId, booking.id]))
        const waitlistedSessionIds = new Set(myWaitlistEntries.map((entry) => entry.sessionId))

        return {
            sessions: rows.map((row) => {
                const myBookingId = myBookingIdBySession.get(row.id) ?? null
                return {
                    id: row.id,
                    startsAt: row.startsAt,
                    capacity: row.capacity,
                    seatsRemaining: row.capacity - row.bookedCount,
                    myBookingId,
                    myStatus: myBookingId ? 'booked' : waitlistedSessionIds.has(row.id) ? 'waitlisted' : null,
                }
            }),
        }
    }, {
        signedIn: true,
        query: t.Object({
            date: t.Optional(t.String({ format: 'date' })),
        }),
    })
    .post('/', async ({ body, set }) => {
        assertRealDate(body.date)

        const hour = String(body.hour).padStart(2, '0')
        const startsAt = new Date(`${body.date}T${hour}:00:00${GYM_UTC_OFFSET}`)

        if (startsAt <= new Date()) {
            throw new ApiError(422, 'SESSION_IN_PAST', 'Sessions can only be created in the future.')
        }

        try {
            const [session] = await db
                .insert(sessions)
                .values({ startsAt, capacity: SESSION_CAPACITY })
                .returning()
            set.status = 201
            return { session }
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ApiError(409, 'SESSION_EXISTS', 'A session already starts at that time.')
            }
            throw error
        }
    }, {
        adminOnly: true,
        body: t.Object({
            date: t.String({ format: 'date' }),
            hour: t.Integer({ minimum: 0, maximum: 23 }),
        }),
    })
    .get('/:id/bookings', async ({ params }) => {
        const [session] = await db.select().from(sessions).where(eq(sessions.id, params.id))
        if (!session) {
            throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found.')
        }

        const sessionBookings = await db
            .select({
                id: bookings.id,
                memberName: users.name,
                memberEmail: users.email,
                cancelled: bookings.cancelled,
                checkedInAt: bookings.checkedInAt,
                bookedAt: bookings.createdAt,
            })
            .from(bookings)
            .innerJoin(users, eq(users.id, bookings.userId))
            .where(eq(bookings.sessionId, session.id))
            .orderBy(asc(bookings.createdAt))

        return { session, bookings: sessionBookings }
    }, {
        adminOnly: true,
        params: t.Object({ id: t.String({ format: 'uuid' }) }),
    })
