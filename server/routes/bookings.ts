import { and, asc, eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { auth } from '../auth'
import { generateCheckInCode } from '../check-in-code'
import { db } from '../db'
import { ApiError, isUniqueViolation } from '../errors'
import { bookings, sessions, waitlist } from '../schema'


export const bookingRoutes = new Elysia({ prefix: '/bookings' })
    .use(auth)
    .post('/', async ({ body, user, set }) => {
        // 0. admins run the gym, they don't book -> 403 FORBIDDEN
        if (user.role === 'admin') {
            throw new ApiError(403, 'FORBIDDEN', 'Admins can not book sessions.')
        }

        try {
            const booking = await db.transaction(async (tx) => {
                const [session] = await tx.select().from(sessions).where(eq(sessions.id, body.sessionId)).for('update')

                if (!session) {
                    throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found.')
                }

                if (session.startsAt <= new Date()) {
                    throw new ApiError(409, 'SESSION_STARTED', 'Session has already started.')
                }

                const booked = await tx.$count(bookings, and(eq(bookings.sessionId, session.id), eq(bookings.cancelled, false)))
                if (booked >= session.capacity) {
                    throw new ApiError(409, 'SESSION_FULL', 'Session is full.')
                }

                const [created] = await tx.insert(bookings).values({ userId: user.id, sessionId: session.id, checkInCode: generateCheckInCode() })
                    .returning()

                await tx.delete(waitlist).where(and(eq(waitlist.sessionId, session.id), eq(waitlist.userId, user.id)))
                return created
            })
            set.status = 201
            return { booking }
        } catch (error) {
            if (isUniqueViolation(error, 'one_active_booking_per_member')) {
                throw new ApiError(409, 'ALREADY_BOOKED', 'You already have a booking for this session.')
            }
            throw error
        }
    }, {
        signedIn: true,
        body: t.Object({ sessionId: t.String({ format: 'uuid' }) }),
    })

    .post('/:id/cancel',async ({params, user})=>{
        const result = await db.transaction(async (tx)=>{
            const [booking] = await tx.select().from(bookings).where(eq(bookings.id, params.id))
            // now we gotta do a few checks on the id, if id wasn't valid, then return 404
            if(!booking){
                throw new ApiError(404,'BOOKING_NOT_FOUND',"Booking not found.")
            }
            // if id is valid but booking is not of the same user
            if(booking.userId!==user.id){
                throw new ApiError(404,'BOOKING_NOT_FOUND',"Booking not found.")
            }

            if(booking.cancelled){
                throw new ApiError(409, 'BOOKING_ALREADY_CANCELLED',"You can not cancel an already cancelled booking.")
            }
            
            const [session] = await tx.select().from(sessions).where(eq(sessions.id,booking.sessionId)).for('update')

            if(!session){
                throw new ApiError(404,'SESSION_NOT_FOUND',"Session not found.")
            }
            if(session.startsAt <= new Date()){
                throw new ApiError(409, 'SESSION_STARTED',"Session has already started.")
            }

        const [cancelled] = await tx.update(bookings).set({cancelled:true}).where(eq(bookings.id,booking.id)).returning()
        const [firstInWaitlist] = await tx.select().from(waitlist).where(eq(waitlist.sessionId,session.id)).orderBy(asc(waitlist.createdAt)).limit(1)
            if(firstInWaitlist){
                 await tx.insert(bookings).values({userId: firstInWaitlist.userId, sessionId: session.id, checkInCode: generateCheckInCode(),})
                 await tx.delete(waitlist).where(eq(waitlist.id,firstInWaitlist.id))
            }

        return cancelled
        })

        return { booking: result }
    },{
        signedIn: true,
        params: t.Object({ id: t.String({ format: 'uuid' }) }),
    })

