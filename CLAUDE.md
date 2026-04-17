# CLAUDE.md

## Project

Weather Dashboard — MPCS 51238 Design, Build, Ship · Assignment 4 · Spring 2026.
A real-time multi-service app following the same architecture as the in-class NBA scoreboard:
external API → worker → Supabase → Next.js frontend.

GitHub: https://github.com/peiweiwww/bsd-assignment4  
Live: https://bsd-assignment4-web.vercel.app

---

## Architecture

The worker (`apps/worker`) polls Open-Meteo every 5 minutes and writes to `weather_readings` using a service_role Supabase client (bypasses RLS). The Next.js frontend (`apps/web`) fetches initial data server-side via Server Actions and subscribes to Supabase Realtime for live updates. Clerk handles auth; Supabase RLS scopes `cities` data per user via the Clerk JWT `sub` claim.

When a user adds a city, the Server Action also fires a one-shot initial reading inline (also using service_role) so the card shows data immediately instead of waiting up to 5 minutes for the next poll.

---

## Data Model

**`cities`** — user-owned.
- `id` uuid PK, `user_id` text (Clerk JWT sub), `name`, `latitude`, `longitude`, `created_at`
- Unique constraint on `(user_id, latitude, longitude)`
- RLS: user can only select/insert/update/delete their own rows

**`weather_readings`** — append-only time series.
- `id` uuid PK, `city_id` uuid FK → cities(id) ON DELETE CASCADE
- `temperature` (°C), `humidity`, `wind_speed`, `weather_code` (WMO int), `recorded_at`
- RLS: any authenticated user may select; insert/update/delete require service_role
- In `supabase_realtime` publication — every INSERT is broadcast to subscribers

---

## Conventions

**Monorepo:** npm workspaces. Shared code in `packages/shared` is compiled to `dist/` before the worker runs — the pre-build hook is in root `package.json` (`prebuild:worker`, `predev:worker`). Don't skip or remove this step.

**Temperature:** stored as °C everywhere. Conversion to °F happens at render time only, in `UnitContext` (`apps/web/src/app/contexts/UnitContext.tsx`). Never write °F to the DB.

**Supabase clients — two distinct clients in `apps/web`:**
- `createServerSupabaseClient()` in `src/lib/supabase.ts` — uses Clerk JWT via Authorization header; subject to RLS. Used for all user-scoped reads/writes (cities CRUD, reading cities list).
- `createServiceRoleSupabaseClient()` in `src/lib/supabase.ts` — uses `SUPABASE_SERVICE_ROLE_KEY`; bypasses RLS. Used only for `weather_readings` inserts from Server Actions. Never import this into a Client Component.
- `createBrowserSupabaseClient()` in `src/lib/supabase-browser.ts` — browser-only, used for Realtime WebSocket. Kept in a separate file so it doesn't pull server-only `auth()` into the client bundle.

**Realtime token:** the browser client calls `supabase.realtime.setAuth(token)` with a Clerk session token before subscribing. The `CityListRealtime` component refreshes the token proactively every 50 seconds (Clerk tokens expire ~60s) to prevent silent disconnects. Reconnect logic retries up to 10 times with 5s delay.

**Commits:** conventional commits — `feat(scope):`, `fix(scope):`, `chore:`. Scopes: `web`, `worker`, `shared`, `db`.

---

## Things That Bit Us — Don't Repeat

| Mistake | Fix |
|---|---|
| Inserting into `weather_readings` with the anon client → RLS blocks it silently | Use `createServiceRoleSupabaseClient()` for this write path |
| `[getToken]` in useEffect dependency array → effect re-runs on every render, WebSocket never stabilizes | Use `[]` — getToken is stable; token is fetched inside the async function |
| Clerk JWT (~60s TTL) expiring mid-session → Realtime goes CLOSED, retries fail with same stale token | Proactive `setAuth(newToken)` every 50s in setInterval |
| `packages/shared` pointing to `.ts` source → tsx doesn't transpile node_modules, named exports vanish | Build shared to `dist/` and point `main`/`exports` at `dist/index.js` |
| `supabase.ts` importing `auth` from `@clerk/nextjs/server` at module level → Next.js pulls it into client bundle when any export is imported | Split into `supabase.ts` (server-only) and `supabase-browser.ts` (client-safe) |
| Static prerender of `/_not-found` tries to render `ClerkProvider` with placeholder key → build fails | Add `export const dynamic = 'force-dynamic'` to root layout |
