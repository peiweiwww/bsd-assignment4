# Supabase Setup

This directory contains plain SQL migration files. There is no Supabase CLI config here —
run the SQL manually in the Supabase Dashboard as described below.

---

## 1. Run the migration

1. Open your Supabase project → **SQL Editor** (left sidebar).
2. Click **New query**.
3. Copy the full contents of [`migrations/0001_init.sql`](./migrations/0001_init.sql) and paste it into the editor.
4. Click **Run** (or press `Ctrl/Cmd + Enter`).
5. Confirm there are no errors in the output panel. You should see messages for each
   `CREATE TABLE`, `CREATE INDEX`, `CREATE POLICY`, and `ALTER PUBLICATION` statement.

---

## 2. Verify Realtime is enabled for weather_readings

1. Go to **Database → Publications** in the left sidebar.
2. Find the **supabase_realtime** publication.
3. Confirm that `weather_readings` appears in its table list.

If it is missing, run this manually in SQL Editor:

```sql
alter publication supabase_realtime add table weather_readings;
```

---

## 3. Configure Clerk as a Third-Party JWT Provider

Supabase needs to trust Clerk-issued JWTs so that `auth.jwt() ->> 'sub'` resolves
correctly and the RLS policies on `cities` work.

1. Go to **Authentication → Third-party Auth** (or **Auth → Providers**, depending on
   your Dashboard version).
2. Add a new JWT provider and select **Clerk** (or enter a custom JWKS URL).
3. Supply your Clerk **JWKS endpoint** URL — find it in your Clerk Dashboard under
   **API Keys → Advanced → JWT public key / JWKS URL**.
4. Save. Supabase will now validate Clerk-signed tokens on every authenticated request.

> Without this step the RLS policies will never match: `auth.jwt()` will return null
> for Clerk tokens, and all `cities` queries from the frontend will return 0 rows.

---

## 4. Verify RLS policies

1. Go to **Authentication → Policies** in the left sidebar.
2. Select the **public** schema.
3. Confirm you see:
   - **cities** table — 4 policies: select, insert, update, delete (all scoped to `auth.jwt() ->> 'sub' = user_id`)
   - **weather_readings** table — 1 policy: select for authenticated users

---

## Schema summary

| Table | RLS | Realtime |
|---|---|---|
| `cities` | Enabled — per-user via Clerk JWT `sub` | No |
| `weather_readings` | Enabled — any authenticated user may select; worker writes via `service_role` (bypasses RLS) | Yes |
