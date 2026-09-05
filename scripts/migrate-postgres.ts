import { Effect } from "effect";
import { makePostgresClientLayer } from "../src/lib/database/postgres-client-layer";
import { runPostgresMigrations } from "../src/lib/database/postgres-migrations";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://ride_sg:ride_sg@127.0.0.1:54329/ride_sg";
const postgresClientLayer = makePostgresClientLayer(databaseUrl, 1);

async function migratePostgresDatabase() {
  const appliedMigrations = await Effect.runPromise(
    runPostgresMigrations.pipe(Effect.provide(postgresClientLayer)),
  );

  if (appliedMigrations.length === 0) {
    console.log("PostgreSQL migrations are already current");
    return;
  }

  console.log(
    `Applied PostgreSQL migrations: ${appliedMigrations.map(([id, name]) => `${id}_${name}`).join(", ")}`,
  );
}

migratePostgresDatabase().catch((error) => {
  console.error("PostgreSQL migration failed", error);
  process.exitCode = 1;
});
