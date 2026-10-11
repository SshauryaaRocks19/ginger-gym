import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs outside Next.js, so it doesn't load .env.local on its own
process.loadEnvFile('.env.local')

export default defineConfig({
  schema: './server/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
