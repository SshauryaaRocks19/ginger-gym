# Ginger Gym

Booking system for a gym that runs one-hour sessions of 20 people. Members book, cancel and join waitlists. Admins create sessions and check people in with a code.

## Design note

- Next.js 16 app with API built in: Elysia handles everything under `/api` through one route, so the frontend and backend deploy basically together
- Frontend uses customised HeroUI components (I wanted the UI to look cartoonish so thats why the customisation), Tailwind, and TanStack Query for fetching, and updating booking.
- Postgres on Supabase (database only), queried with Drizzle. Passwords are hashed with bcrypt. Login sets an httpOnly cookie with a JWT holding only the user id.
- Tables: 4 tables:  `users` (member or admin), `sessions` (start time, capacity), `bookings` (user, session, cancelled, check-in code, checked-in time), `waitlist` (user, session, joined time).
- A partial unique index allows one active booking per member per session, so rebooking after a cancel still works.
- Seats left are counted from bookings, not stored. Booking and cancelling lock the session row inside a transaction, so the last seat can't be taken twice and a cancel promotes the first waitlisted member in the same step.

## Assumptions

- The gym is in India, so all times are in IST.
- Capacity is fixed at 20. The admin form offers start times from 06:00 to 21:00.
- Admins can only run the gym and cant book sessions or join waitlists.
- You can join a waitlist only when the session is full. Booking a session takes you off its waitlist.
- Check-in codes work from the session's start until one hour later, are single use, and ignore case.
- Asking for someone else's booking returns 404 rather than 403.
- Seat counts refresh every 5 seconds.
- My bookings shows all your active bookings, including past ones.

## Test logins

Admin: `admin@gingergym.test` / `AdminPass123`

Members, all with password `MemberPass123`:

- `george@gingergym.test`: booked into the session happening now and tomorrow evening
- `ramesh@gingergym.test`: booked now, and on the waitlist for tomorrow's full 07:00 session
- `kanye@gingergym.test`: no bookings
- `member01@gingergym.test` to `member20@gingergym.test`: fill tomorrow's 07:00 session

## Running it

Copy `.env.example` to `.env.local` and set `DATABASE_URL` and `JWT_SECRET`, then:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`db:seed` deletes all data before adding the test accounts. Run it again before a demo so there is a session in the current hour to check in to.
