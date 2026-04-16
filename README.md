# Weather Dashboard

A real-time weather dashboard built as a monorepo with a Node.js worker, Supabase for storage and realtime, and a Next.js frontend with Clerk authentication.

## Architecture

```
Open-Meteo API
      │
      ▼
Node.js Worker (Railway)
      │  polls weather data, writes to Supabase
      ▼
Supabase (Postgres + Realtime)
      │  stores cities & weather readings
      │  pushes realtime updates
      ▼
Next.js Frontend (Vercel)
      │  reads data, subscribes to realtime
      ▼
User (Clerk auth)
```

- **Open-Meteo**: free, no-API-key weather source
- **Worker**: fetches weather for each tracked city on a schedule, upserts readings into Supabase
- **Supabase**: `cities` table (user-specific), `weather_readings` table (shared across users)
- **Next.js**: displays dashboard; Supabase Realtime pushes live updates
- **Clerk**: handles authentication; `user_id` scopes each user's city list

## Local Development

```bash
# Install all workspace dependencies from the repo root
npm install

# Start the worker in watch mode
npm run dev:worker

# Start the Next.js frontend (once scaffolded)
npm run dev:web
```

## Environment Variables

### Worker (`apps/worker/.env`)

Copy `apps/worker/.env.example` → `apps/worker/.env` and fill in real values.

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bypasses RLS for server-side writes |
| `POLL_INTERVAL_MS` | How often to poll Open-Meteo (default: 300000 = 5 min) |

### Web (`apps/web/.env.local`)

Copy `apps/web/.env.local.example` → `apps/web/.env.local` and fill in real values.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (from Clerk Dashboard → API Keys) |
| `CLERK_SECRET_KEY` | Clerk secret key — server-side only |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for client-side access |

## Third-party Setup

### Supabase

1. Run `supabase/migrations/0001_init.sql` in Dashboard → SQL Editor.
2. Go to **Authentication → Third-party Auth** and add Clerk as a JWT provider
   (supply your Clerk JWKS URL from Clerk Dashboard → API Keys → Advanced).
3. Confirm `weather_readings` is in the `supabase_realtime` publication
   (Database → Publications).

### Clerk

1. Create a Clerk application at [clerk.com](https://clerk.com).
2. Copy the publishable key and secret key into `apps/web/.env.local`.
3. Enable the **Supabase** integration in Clerk Dashboard → Integrations
   so that Clerk issues JWTs accepted by Supabase RLS policies.

## Deployment

| Service | What it runs |
|---|---|
| **Railway** | `apps/worker` — long-running Node.js process that polls Open-Meteo |
| **Vercel** | `apps/web` — Next.js frontend with serverless functions |
| **Supabase** | Managed Postgres database + Realtime subscriptions |
| **Clerk** | Authentication and user management |
