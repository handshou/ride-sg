import { SqlClient } from "@effect/sql";
import { Effect, Layer, Schema } from "effect";
import { makePostgresClientLayer } from "../database/postgres-client-layer";
import {
  RainfallReadingRecordSchema,
  RainfallRepository,
  RainfallRepositoryError,
  type RainfallRepositoryService,
} from "./rainfall-repository";

interface PostgresRainfallReadingRow {
  readonly stationId: string;
  readonly stationName: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly value: number;
  readonly timestamp: string;
  readonly fetchedAt: number;
}

const decodeRows = (rows: ReadonlyArray<PostgresRainfallReadingRow>) =>
  Schema.decodeUnknown(Schema.Array(RainfallReadingRecordSchema))(rows);

const makePostgresRainfallRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const selectColumns = sql.unsafe(`
    station_id AS "stationId",
    station_name AS "stationName",
    latitude,
    longitude,
    value,
    reading_timestamp AS timestamp,
    fetched_at::double precision AS "fetchedAt"
  `);

  const repository: RainfallRepositoryService = {
    saveReadings: (readings) =>
      Effect.gen(function* () {
        if (readings.length === 0) return;
        yield* sql`
          INSERT INTO rainfall_readings ${sql.insert(
            readings.map((reading) => ({
              id: crypto.randomUUID(),
              station_id: reading.stationId,
              station_name: reading.stationName,
              latitude: reading.latitude,
              longitude: reading.longitude,
              value: reading.value,
              reading_timestamp: reading.timestamp,
              fetched_at: reading.fetchedAt,
            })),
          )}
        `;
      }).pipe(
        Effect.mapError(
          (cause) => new RainfallRepositoryError("save readings", cause),
        ),
      ),

    getLatestReadings: () =>
      Effect.gen(function* () {
        const rows = yield* sql<PostgresRainfallReadingRow>`
          SELECT ${selectColumns}
          FROM rainfall_readings
          WHERE fetched_at = (SELECT max(fetched_at) FROM rainfall_readings)
          ORDER BY station_id ASC
        `;
        return yield* decodeRows(rows);
      }).pipe(
        Effect.mapError(
          (cause) => new RainfallRepositoryError("get latest readings", cause),
        ),
      ),

    deleteOlderThan: (cutoffTimestamp) =>
      Effect.gen(function* () {
        const rows = yield* sql<{ readonly id: string }>`
          DELETE FROM rainfall_readings
          WHERE fetched_at < ${cutoffTimestamp}
          RETURNING id
        `;
        return rows.length;
      }).pipe(
        Effect.mapError(
          (cause) => new RainfallRepositoryError("delete older than", cause),
        ),
      ),
  };

  return repository;
});

/** PostgreSQL implementation of the rainfall repository. */
export const PostgresRainfallRepositoryLayer = Layer.effect(
  RainfallRepository,
  makePostgresRainfallRepository,
);

/** Creates a complete rainfall repository layer for any PostgreSQL URL. */
export const makePostgresRainfallRepositoryLayer = (databaseUrl: string) =>
  PostgresRainfallRepositoryLayer.pipe(
    Layer.provide(makePostgresClientLayer(databaseUrl)),
  );
