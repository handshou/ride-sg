# Deployment: Vercel + Supabase PostgreSQL

Ride-SG runs as a Next.js app on Vercel with PostgreSQL hosted in Supabase. Convex is no longer used. All persistence goes through the Effect repository ports documented in [POSTGRES_SETUP.md](./POSTGRES_SETUP.md).

## Topology

```
Browser ──> Vercel (Next.js, serverless functions)
                │  DATABASE_URL (transaction pooler, port 6543)
                ▼
            Supabase project: handshou's Project (ap-southeast-1)
              role  ride_sg   (login, search_path = ride_sg)
              schema ride_sg  (locations, rainfall_latest,
                               bicycle_parking_cache, captured_images,
                               image_blobs, effect_sql_migrations)
```

The app shares a Supabase project with other hobby apps, so it owns a dedicated role and schema instead of `public`. The role-level `search_path` means no SQL in the codebase names the schema.

## Connection endpoints

Supabase exposes three endpoints. The direct host is IPv6-only, which fails on most home networks and on Vercel, so both the app and tooling use the IPv4 pooler.

| Purpose                       | Host                                          | Port | User                          | Notes                                  |
| ----------------------------- | --------------------------------------------- | ---- | ----------------------------- | -------------------------------------- |
| App runtime (Vercel)          | `aws-1-ap-southeast-1.pooler.supabase.com`    | 6543 | `ride_sg.<project-ref>`       | Transaction mode. Driver runs `prepare: false` automatically. |
| Migrations, scripts           | `aws-1-ap-southeast-1.pooler.supabase.com`    | 5432 | `ride_sg.<project-ref>`       | Session mode.                          |
| Provisioning (one-off)        | `aws-1-ap-southeast-1.pooler.supabase.com`    | 5432 | `postgres.<project-ref>`      | Admin role. Never used by the app.     |

Append `?sslmode=require` to every URL. `src/lib/database/postgres-client-layer.ts` detects pooler URLs (port 6543, `pooler.supabase.com`, `-pooler.` hosts, `pgbouncer=true`) and disables prepared statements.

## Local files

`.env.remote` (gitignored) holds the remote credentials used by the scripts below:

```
ADMIN_DATABASE_URL=postgresql://postgres.<ref>:<admin-password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
RIDE_SG_DB_PASSWORD=<password for the ride_sg role>
DATABASE_URL=postgresql://ride_sg.<ref>:<password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
DATABASE_URL_POOLED=postgresql://ride_sg.<ref>:<password>@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_POOL_MAX=3
```

`.env.local` keeps pointing at the Docker PostgreSQL from `compose.yaml` for day-to-day development.

## One-time provisioning

Already done for `handshou's Project`. To repeat on a fresh Supabase project:

```bash
pnpm run db:provision:remote   # creates role ride_sg, schema ride_sg, pins search_path
pnpm run db:migrate:remote     # applies src/lib/database/postgres-migrations.ts
```

`scripts/provision-postgres-tenant.ts` is idempotent. Re-running it only rotates the `ride_sg` password to the value in `RIDE_SG_DB_PASSWORD`.

## Migrations

Migrations are manual and run before deploying code that needs them:

```bash
pnpm run db:migrate:remote
```

They never run during the Vercel build. Migrations are forward-only; write a new numbered entry in `postgres-migrations.ts` rather than editing an applied one.

## Vercel configuration

Project `ride-sg` is linked in `.vercel/`. Set these in Vercel → Project → Settings → Environment Variables, or with the CLI:

```bash
vercel env add DATABASE_URL production        # paste DATABASE_URL_POOLED from .env.remote
vercel env add DATABASE_POOL_MAX production   # 3
```

Keep the existing keys: `MAPBOX_ACCESS_TOKEN`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, `OPENAI_API_KEY`, `EXA_API_KEY`, `LTA_ACCOUNT_KEY`. Remove `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`; nothing reads them.

Preview deployments may share the production database or get their own `ride_sg_preview` schema via a second provisioning run; either way set `DATABASE_URL` for the Preview environment explicitly.

`vercel.json` pins the build to `pnpm run build` and overrides the old dashboard command `npx convex deploy && pnpm run build`, which would fail now that Convex is gone. `instrumentation.ts` connects the pool when each serverless instance starts.

## Serverless limits to know

- Request body limit is 4.5 MB on Vercel functions. `POST /api/images` rejects files over 4 MB.
- Each function instance holds up to `DATABASE_POOL_MAX` connections. The transaction pooler multiplexes them, so 3 is plenty.
- Rainfall write-through runs on each `/singapore` render as one upsert that skips unchanged stations. Table stays at about 88 rows. No cron needed.

## Deploy

```bash
git push origin main        # Vercel auto-deploys the production branch
vercel --prod               # or deploy the current checkout directly
```

Smoke test after deploy:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<deployment>/singapore
curl -s https://<deployment>/api/locations?city=singapore
curl -s https://<deployment>/api/images
```

## Rollback

Redeploy the previous Vercel deployment from the dashboard. Database migrations are additive, so older code keeps working against a newer schema.
