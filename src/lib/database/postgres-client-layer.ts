import { PgClient } from "@effect/sql-pg";
import { Effect, Layer, Redacted } from "effect";
import { ConfigService } from "../services/config-service";

/**
 * Detects transaction-mode connection poolers (Supabase Supavisor on port
 * 6543, Neon "-pooler" hosts, PgBouncer). These do not support named prepared
 * statements, so the driver must send unnamed statements.
 */
export const isTransactionPoolerUrl = (databaseUrl: string): boolean => {
  try {
    const url = new URL(databaseUrl);
    return (
      url.port === "6543" ||
      url.hostname.includes("pooler.supabase.com") ||
      url.hostname.includes("-pooler.") ||
      url.searchParams.get("pgbouncer") === "true"
    );
  } catch {
    return false;
  }
};

/** Creates a PostgreSQL client layer for any connection URL. */
export const makePostgresClientLayer = (
  databaseUrl: string,
  maxConnections = 10,
) =>
  PgClient.layer({
    url: Redacted.make(databaseUrl),
    maxConnections,
    prepare: !isTransactionPoolerUrl(databaseUrl),
  });

/**
 * Shared PostgreSQL client built from server configuration.
 *
 * Every PostgreSQL repository adapter is provided this single layer so the
 * server runtime owns one connection pool.
 */
export const ConfiguredPostgresClientLayer = Layer.unwrapEffect(
  Effect.map(ConfigService, (config) =>
    makePostgresClientLayer(
      config.database.url,
      config.database.maxConnections,
    ),
  ),
);
