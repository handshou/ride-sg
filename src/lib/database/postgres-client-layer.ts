import { PgClient } from "@effect/sql-pg";
import { Effect, Layer, Redacted } from "effect";
import { ConfigService } from "../services/config-service";

/** Creates a PostgreSQL client layer for any connection URL. */
export const makePostgresClientLayer = (
  databaseUrl: string,
  maxConnections = 10,
) =>
  PgClient.layer({
    url: Redacted.make(databaseUrl),
    maxConnections,
  });

/**
 * Shared PostgreSQL client built from server configuration.
 *
 * Every PostgreSQL repository adapter is provided this single layer so the
 * server runtime owns one connection pool.
 */
export const ConfiguredPostgresClientLayer = Layer.unwrapEffect(
  Effect.map(ConfigService, (config) =>
    makePostgresClientLayer(config.database.url),
  ),
);
