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

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS for server-side writes) |

### Web (`apps/web/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for client-side access |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key (server-side only) |

## Deployment

| Service | What it runs |
|---|---|
| **Railway** | `apps/worker` — long-running Node.js process that polls Open-Meteo |
| **Vercel** | `apps/web` — Next.js frontend with serverless functions |
| **Supabase** | Managed Postgres database + Realtime subscriptions |
| **Clerk** | Authentication and user management |
