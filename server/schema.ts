import { sql } from 'drizzle-orm';
import { integer, pgEnum, pgTable, text, timestamp, unique, uniqueIndex, uuid, boolean } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['member', 'admin'])

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})  

export const sessions = pgTable('sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    capacity: integer('capacity').default(20).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().unique(),
})

export const bookings = pgTable('bookings', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    sessionId: uuid('session_id').notNull().references(() => sessions.id),
    cancelled: boolean('cancelled').default(false).notNull(),
    checkInCode: text('check_in_code').notNull().unique(),
    checkedInAt: timestamp('checked_in_at', {withTimezone:true}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

}, (table) => [
    uniqueIndex('one_active_booking_per_member').on(table.userId, table.sessionId).where(sql`${table.cancelled} = false`),
])

export const waitlist = pgTable('waitlist', {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => sessions.id),
    userId: uuid('user_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    unique().on(table.sessionId, table.userId)
])

