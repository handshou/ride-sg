/**
 * Provision an isolated role + schema for ride-sg inside a shared PostgreSQL
 * project (for example a Supabase project that also hosts other apps).
 *
 * Idempotent. Run with an admin connection URL:
 *
 *   ADMIN_DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres \
 *   RIDE_SG_DB_PASSWORD=<strong password> \
 *   pnpm exec tsx scripts/provision-postgres-tenant.ts
 *
 * Creates:
 *   - role   ride_sg  (login, password from RIDE_SG_DB_PASSWORD)
 *   - schema ride_sg  owned by that role
 *   - role-level search_path = ride_sg so every adapter and the migrator use
 *     the schema without qualifying table names
 *
 * Afterwards set the app's DATABASE_URL to connect as ride_sg through the
 * transaction pooler (Supabase: user "ride_sg.<ref>", port 6543) and run
 * `pnpm run db:migrate` with the direct (port 5432) ride_sg URL.
 */
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";
import { makePostgresClientLayer } from "../src/lib/database/postgres-client-layer";

const ROLE = "ride_sg";
const SCHEMA = "ride_sg";

const adminUrl = process.env.ADMIN_DATABASE_URL;
const tenantPassword = process.env.RIDE_SG_DB_PASSWORD;

if (!adminUrl || !tenantPassword) {
  console.error(
    "Set ADMIN_DATABASE_URL and RIDE_SG_DB_PASSWORD before running this script",
  );
  process.exit(1);
}

const quoteLiteral = (value: string) => `'${value.replace(/'/g, "''")}'`;

const provision = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const existingRole = yield* sql<{ rolname: string }>`
    SELECT rolname FROM pg_roles WHERE rolname = ${ROLE}
  `;
  if (existingRole.length === 0) {
    yield* sql.unsafe(
      `CREATE ROLE ${ROLE} LOGIN PASSWORD ${quoteLiteral(tenantPassword)}`,
    );
    console.log(`Created role ${ROLE}`);
  } else {
    yield* sql.unsafe(
      `ALTER ROLE ${ROLE} WITH LOGIN PASSWORD ${quoteLiteral(tenantPassword)}`,
    );
    console.log(`Role ${ROLE} exists, password updated`);
  }

  // Admin must be a member of the role before it can create objects owned by it
  yield* sql.unsafe(`GRANT ${ROLE} TO CURRENT_USER`);
  yield* sql.unsafe(
    `CREATE SCHEMA IF NOT EXISTS ${SCHEMA} AUTHORIZATION ${ROLE}`,
  );
  yield* sql.unsafe(`ALTER ROLE ${ROLE} SET search_path = ${SCHEMA}`);

  const currentDatabase = yield* sql<{ name: string }>`
    SELECT current_database() AS name
  `;
  yield* sql.unsafe(
    `GRANT CONNECT ON DATABASE "${currentDatabase[0].name}" TO ${ROLE}`,
  );

  console.log(
    `Schema ${SCHEMA} ready, role ${ROLE} search_path pinned to ${SCHEMA}`,
  );
});

Effect.runPromise(
  provision.pipe(Effect.provide(makePostgresClientLayer(adminUrl, 1))),
).then(
  () => process.exit(0),
  (error) => {
    console.error("Provisioning failed", error);
    process.exit(1);
  },
);
