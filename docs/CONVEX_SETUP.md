# Setting Up Convex for Ride-SG

Ride-SG uses a Convex deployment for saved locations, cached bicycle parking, rainfall data, and captured images.

## Recommended local development

Install dependencies, then start Convex and Next.js together:

```bash
pnpm install
pnpm run dev:all
```

`dev:all` keeps the local Convex backend running, pushes the functions and schema, and starts Next.js. Leave this process running while developing.

Open:

- App: <http://localhost:3000>
- Local Convex dashboard: <http://127.0.0.1:6790>

To verify the configured deployment from another terminal:

```bash
pnpm run convex:health
```

A healthy local deployment reports:

```text
Convex health check passed: local deployment responded in <duration>ms
```

## Run the services separately

Use two terminals when separate logs are useful:

```bash
# Terminal 1: local database, schema, and Convex functions
pnpm run dev:convex

# Terminal 2: Next.js
pnpm run dev
```

A local deployment is a subprocess of `convex dev`. It stops when that command stops, so `NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210` will return `ECONNREFUSED` unless `dev:convex` or `dev:all` is still running.

Do not use `convex dev --once` to serve the application. It pushes the schema successfully and then exits, which also stops the local database.

## Create a fresh local database and install the schema

The first local start creates an empty local database. Convex stores its state under `.convex/` and automatically pushes [`convex/schema.ts`](../convex/schema.ts).

```bash
pnpm run dev:convex
```

A successful installation ends with:

```text
Convex functions ready!
```

The schema currently defines these tables:

- `locations`
- `bicycleParking`
- `rainfall`
- `capturedImages`

Starting a fresh local deployment does not copy data from a cloud deployment. Use Convex backup/export and restore/import when data must also be moved.

## Cloud development or production

Authenticate and select a cloud development deployment when the database must remain available without a local process:

```bash
pnpm exec convex login
pnpm exec convex deployment select dev
pnpm exec convex dev
```

Deploy production functions and `convex/schema.ts` with:

```bash
pnpm exec convex deploy
```

Set the resulting `NEXT_PUBLIC_CONVEX_URL` and deployment credentials in the hosting environment. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the rest of the application deployment.

## Effect Schema and the database schema

Effect Schema and Convex schema solve different problems:

- `effect/Schema` validates and transforms application/API values at runtime.
- `convex/schema.ts` defines Convex tables, indexes, generated TypeScript types, and database-side validation.

Effect Schema does **not** create Convex tables or indexes, and Convex does not natively compile an Effect Schema into `defineTable`/`v` validators. Keep `convex/schema.ts` as the database source of truth and use the schemas under `src/lib/schema/` at external boundaries.

If Convex is replaced with SQLite or PostgreSQL, Effect's SQL packages can run migrations, but that is a database-adapter migration rather than a schema-only change. Ride-SG's Convex subscriptions, mutations, file storage, and scheduled functions would also need replacements.

## Changing a populated schema

Convex validates existing documents when a changed schema is pushed. For a new required field:

1. Add the field as optional in `convex/schema.ts`.
2. Push the schema with `pnpm run dev:convex`.
3. Run a migration from `convex/migrations.ts` or `convex/migrations/` to backfill existing documents.
4. Make the field required and push again.

## Troubleshooting

### `ECONNREFUSED` on port 3210

The configured deployment is local but the local backend is stopped.

```bash
pnpm run dev:convex
# or
pnpm run dev:all
```

### `Cannot find module './_generated/server'`

Generate files and push the schema:

```bash
pnpm run dev:convex
```

### Convex is healthy but contains no rows

A new local deployment is intentionally empty. View its tables in the local dashboard or import a backup from the old deployment.

### Schema push fails

Read the validation error printed by `convex dev`. Existing rows may not satisfy a new required field; use the optional-field migration sequence above.

### Environment variables are not loading

Confirm `.env.local` contains both `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`, then restart Next.js. Do not print or commit the full file because it can contain unrelated secrets.
