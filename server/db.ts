import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set')
}

// Supabase's transaction pooler can't handle prepared statements
const client = postgres(databaseUrl, { prepare: false })

export const db = drizzle(client)
