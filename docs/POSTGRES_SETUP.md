# PostgreSQL Persistence

Ride-SG persists all application data through Effect repository ports backed by PostgreSQL adapters (`@effect/sql-pg`). Convex has been removed.

## Ports and adapters

| Port (Context tag)              | Adapter                                              | Table(s)                         | Used by                                   |
| ------------------------------- | ---------------------------------------------------- | -------------------------------- | ----------------------------------------- |
| `LocationRepository`            | `postgres-location-repository.ts`                    | `locations`                      | save/delete/search actions, `/api/locations` |
| `RainfallRepository`            | `postgres-rainfall-repository.ts`                    | `rainfall_readings`              | `getRainfallData` write-through and fallback |
| `BicycleParkingCacheRepository` | `postgres-bicycle-parking-cache-repository.ts`       | `bicycle_parking_cache`          | `BicycleParkingService` LTA cache         |
| `CapturedImageRepository`       | `postgres-captured-image-repository.ts`              | `captured_images`                | `CapturedImageService`, `/api/images`     |
| `ImageBlobStore`                | `postgres-image-blob-store.ts`                       | `image_blobs`                    | `CapturedImageService`                    |

All adapters live in `src/lib/repositories/` and share one connection pool from `src/lib/database/postgres-client-layer.ts`. `src/lib/runtime/server-layer.ts` binds ports to adapters in `PersistenceLayer`; application code depends only on the port tags.

In-memory adapters exist for `LocationRepository`, `RainfallRepository`, and `BicycleParkingCacheRepository` for isolated tests.

## Start local development

Docker Desktop must be running. Then use:

```bash
pnpm run dev:all
```

This command:

1. Starts PostgreSQL 17 from `compose.yaml`.
2. Runs forward-only Effect SQL migrations from `src/lib/database/postgres-migrations.ts`.
3. Starts Next.js.

PostgreSQL data persists in the `ride_sg_postgres_data` Docker volume.

## Database commands

```bash
pnpm run db:start       # Start PostgreSQL and wait until healthy
pnpm run db:migrate     # Apply pending Effect SQL migrations
pnpm run test:postgres  # Run repository integration tests against PostgreSQL
pnpm run db:stop        # Stop PostgreSQL without deleting data
```

The default local connection is:

```text
postgresql://ride_sg:ride_sg@127.0.0.1:54329/ride_sg
```

Override it with the server-only `DATABASE_URL` environment variable.

## Runtime bootstrap

`instrumentation.ts` builds the Effect `ManagedRuntime` and awaits its layer during `register()`. The PostgreSQL pool connects asynchronously, so this pre-build is what allows `runServerEffect` (synchronous) to be used in server components.

## Data lifecycle

- Rainfall: each page render fetches NEA and writes the batch through to `rainfall_readings`, then purges readings older than 2 days. If NEA fails the latest stored batch is served. No scheduler is required.
- Bicycle parking: LTA results are cached per query point (0.01 degree bounding box). Entries older than 24 hours are purged on each refresh.
- Captured images: bytes are stored as `bytea` in `image_blobs` and served from `GET /api/images/[id]/blob` with immutable cache headers. Metadata lives in `captured_images`. Vision analysis receives a `data:` URL so it works without a public image host.

## Client data access

Client components never hold a database client. They call the JSON routes under `src/app/api/` through hooks (`use-randomizable-locations.ts`, `use-captured-images.ts`) that refresh on a change event and a slow poll.

## Hosted database

Production uses Supabase PostgreSQL through its transaction pooler. See [DEPLOYMENT.md](./DEPLOYMENT.md) for endpoints, provisioning, and Vercel variables. Remote commands read `.env.remote`:

```bash
pnpm run db:provision:remote  # one-off: role + schema + search_path
pnpm run db:migrate:remote    # apply migrations to the remote schema
```

Any other PostgreSQL provider works the same way: set `DATABASE_URL` and run the migrator. Pooler URLs (port 6543, `pooler.supabase.com`, `-pooler.` hosts, `pgbouncer=true`) automatically disable prepared statements. `DATABASE_POOL_MAX` sizes the per-instance pool.

To move image bytes to object storage, implement `ImageBlobStore` with a new adapter and swap it in `PersistenceLayer`. Nothing else changes.
