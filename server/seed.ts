import bcrypt from 'bcryptjs'
import { generateCheckInCode } from './check-in-code'
import { db } from './db'
import { bookings, sessions, users, waitlist } from './schema'

const ADMIN_PASSWORD = 'AdminPass123'
const MEMBER_PASSWORD = 'MemberPass123'
const FILLER_MEMBER_COUNT = 20
const GYM_UTC_OFFSET_HOURS = 5.5

function gymTime(daysFromToday: number, hour: number) {
    const nowInGym = new Date(Date.now() + GYM_UTC_OFFSET_HOURS * 60 * 60 * 1000)
    nowInGym.setUTCDate(nowInGym.getUTCDate() + daysFromToday)
    const date = nowInGym.toISOString().slice(0, 10)
    return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+05:30`)
}

function currentGymHour() {
    const nowInGym = new Date(Date.now() + GYM_UTC_OFFSET_HOURS * 60 * 60 * 1000)
    return nowInGym.getUTCHours()
}

async function seed() {
    await db.delete(waitlist)
    await db.delete(bookings)
    await db.delete(sessions)
    await db.delete(users)

    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
    const memberHash = await bcrypt.hash(MEMBER_PASSWORD, 10)

    await db.insert(users).values({ name: 'Aman', email: 'admin@gingergym.test', passwordHash: adminHash, role: 'admin' })

    const [george, ramesh] = await db
        .insert(users)
        .values([
            { name: 'George Washington', email: 'george@gingergym.test', passwordHash: memberHash },
            { name: 'Ramesh Ublababu', email: 'ramesh@gingergym.test', passwordHash: memberHash },
            { name: 'Kanye West', email: 'kanye@gingergym.test', passwordHash: memberHash },
        ])
        .returning()

    const fillerMembers = await db
        .insert(users)
        .values(Array.from({ length: FILLER_MEMBER_COUNT }, (_, i) => ({
            name: `Member ${i + 1}`,
            email: `member${String(i + 1).padStart(2, '0')}@gingergym.test`,
            passwordHash: memberHash,
        })))
        .returning()

    const [liveNow, fullTomorrow, eveningTomorrow, ...later] = await db
        .insert(sessions)
        .values([
            { startsAt: gymTime(0, currentGymHour()) },
            { startsAt: gymTime(1, 7) },
            { startsAt: gymTime(1, 18) },
            { startsAt: gymTime(2, 7) },
            { startsAt: gymTime(2, 18) },
            { startsAt: gymTime(3, 10) },
        ])
        .returning()

    await db.insert(bookings).values([
        { userId: george.id, sessionId: liveNow.id, checkInCode: generateCheckInCode() },
        { userId: ramesh.id, sessionId: liveNow.id, checkInCode: generateCheckInCode() },
        ...fillerMembers.map((member) => ({
            userId: member.id,
            sessionId: fullTomorrow.id,
            checkInCode: generateCheckInCode(),
        })),
        { userId: george.id, sessionId: eveningTomorrow.id, checkInCode: generateCheckInCode() },
        { userId: fillerMembers[0].id, sessionId: later[0].id, checkInCode: generateCheckInCode() },
        { userId: fillerMembers[1].id, sessionId: later[0].id, checkInCode: generateCheckInCode() },
    ])

    await db.insert(waitlist).values({ userId: ramesh.id, sessionId: fullTomorrow.id })

    console.log('Seeded: 1 admin, 23 members, 6 sessions (one full, with Ramesh on its waitlist).')
}

seed()
    .then(() => db.$client.end())
    .catch(async (error) => {
        console.error(error)
        await db.$client.end()
        process.exit(1)
    })
