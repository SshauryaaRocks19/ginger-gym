import { and, asc, eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../auth'
import { db } from '../db'
import { ApiError, isUniqueViolation } from '../errors'
import { bookings, sessions, waitlist } from '../schema'

export const waitlistRoutes = new Elysia({ prefix: '/sessions' })
    .use(auth)
    .post('/:id/waitlist', async ({ params, user, set }) => {
        if (user.role === 'admin') {
            throw new ApiError(403, 'FORBIDDEN', 'Admins cannot join waitlists.')
        }

        try {
            const result = await db.transaction(async (tx) => {
                // same lock as booking, so "is it full?" can't change while we check
                const [session] = await tx.select().from(sessions).where(eq(sessions.id, params.id)).for('update')
                if (!session) {
                    throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found.')
                }
                if (session.startsAt <= new Date()) {
                    throw new ApiError(409, 'SESSION_STARTED', 'Session has already started.')
                }

                const activeBooking = and(eq(bookings.sessionId, session.id), eq(bookings.cancelled, false))
                const booked = await tx.$count(bookings, activeBooking)
                if (booked < session.capacity) {
                    throw new ApiError(409, 'SESSION_NOT_FULL', 'This session still has seats. Book it instead.')
                }

                const alreadyBooked = await tx.$count(bookings, and(activeBooking, eq(bookings.userId, user.id)))
                if (alreadyBooked > 0) {
                    throw new ApiError(409, 'ALREADY_BOOKED', 'You already have a booking for this session.')
                }

                const [entry] = await tx
                    .insert(waitlist)
                    .values({ sessionId: session.id, userId: user.id })
                    .returning()

                // position = place in the queue, oldest entry first
                const queue = await tx
                    .select({ userId: waitlist.userId })
                    .from(waitlist)
                    .where(eq(waitlist.sessionId, session.id))
                    .orderBy(asc(waitlist.createdAt))
                const position = queue.findIndex((row) => row.userId === user.id) + 1

                return { entry, position }
            })

            set.status = 201
            return result
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new ApiError(409, 'ALREADY_WAITLISTED', 'You are already on the waitlist for this session.')
            }
            throw error
        }
    }, {
        signedIn: true,
        params: t.Object({ id: t.String({ format: 'uuid' }) }),
    })
    .delete('/:id/waitlist', async ({ params, user }) => {
        const removed = await db
            .delete(waitlist)
            .where(and(eq(waitlist.sessionId, params.id), eq(waitlist.userId, user.id)))
            .returning()

        if (removed.length === 0) {
            throw new ApiError(404, 'NOT_ON_WAITLIST', 'You are not on the waitlist for this session.')
        }

        // a 204 must have no body; Elysia's set.status = 204 still sends one on Node
        return new Response(null, { status: 204 })
    }, {
        signedIn: true,
        params: t.Object({ id: t.String({ format: 'uuid' }) }),
    })
