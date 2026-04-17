# Weather Dashboard

A real-time weather app where users add their favorite cities and see live conditions — temperature, humidity, wind, and weather state — updated automatically without refreshing the page. Each user has their own city list; weather data is shared across users and pushed to all connected browsers the moment the worker writes a new reading.

**Live demo:** https://bsd-assignment4-web.vercel.app  
**Stack:** Next.js 15 · Clerk · Supabase · Railway · Vercel · Open-Meteo

---

## Architecture

```
Open-Meteo API
     ↓  (worker polls every 5 min + immediately on new city add)
Node worker (Railway)
     ↓  (INSERT into weather_readings via service_role)
Supabase Postgres ──► Realtime broadcast
     ↑                       ↓
RLS (user-scoped cities)  WebSocket
                               ↓
                       Next.js on Vercel
                               ↕  Clerk auth (JWT → RLS sub claim)
```

The worker runs independently of the frontend — it polls on a fixed schedule regardless of how many users are online, keeping Supabase as the single source of truth. Supabase Realtime broadcasts every new `weather_readings` INSERT over a WebSocket so browsers update instantly without polling. Row-Level Security enforces that each user can only read and write their own `cities` rows, even though the entire app shares one database.

---

## Features

- Add and remove cities (geocoded via Open-Meteo's free geocoding API)
- Live temperature, humidity, wind speed, and weather condition with WMO-code emoji
- Real-time updates via Supabase Realtime — no page refresh needed
- °C / °F toggle with localStorage persistence
- Per-user data scoping via Clerk JWT + Supabase RLS
- Immediate first reading on city add — no waiting up to 5 min for the next poll

---

## Repo Structure

```
apps/
  web/        Next.js 15 frontend (App Router, Server Actions, Clerk)
  worker/     Node.js polling service (TypeScript, compiled to dist/)
packages/
  shared/     Shared TypeScript types + WMO weather code → label mapping
supabase/
  migrations/ SQL: cities table, weather_readings, RLS policies, Realtime
```

---

## Local Development

**1. Clone and install**

```bash
git clone https://github.com/peiweiwww/bsd-assignment4
cd bsd-assignment4/weather-dashboard
npm install
```

**2. Set up Supabase**

- Create a project at [supabase.com](https://supabase.com)
- Run `supabase/migrations/0001_init.sql` in Dashboard → SQL Editor
- Verify `weather_readings` appears in Database → Publications → `supabase_realtime`
- Go to Authentication → Third-Party Auth and add Clerk as a JWT provider (supply your Clerk JWKS URL)

**3. Set up Clerk**

- Create an application at [clerk.com](https://clerk.com)
- In Clerk Dashboard → Integrations, connect Supabase

**4. Environment variables**

`apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

`apps/worker/.env`:
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
POLL_INTERVAL_MS=300000
```

**5. Run**

```bash
# Build shared types first (required before worker can run)
npm run build:shared

# Frontend on :3000
npm run dev:web

# Worker polling loop (separate terminal)
npm run dev:worker
```

---

## Deployment

**Frontend (Vercel):** Import the repo, set Root Directory to the repository root (not `apps/web` — `vercel.json` handles the monorepo build). Add all five web env vars. Vercel auto-deploys on push to `main`.

**Worker (Railway):** Import the repo, set Root Directory to `apps/worker`. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `POLL_INTERVAL_MS`. Build command: `npm install && npm run build`. Start command: `node dist/index.js`. Check Logs for `[worker] Starting.` and periodic `[poll]` lines.
