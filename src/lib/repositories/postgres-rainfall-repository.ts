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
        if (readings.length === 0) return 0;
        // One statement: insert new stations, update stations whose NEA
        // reading moved on, and skip rows whose reading is unchanged.
        const changed = yield* sql<{ readonly stationId: string }>`
          INSERT INTO rainfall_latest ${sql.insert(
            readings.map((reading) => ({
              station_id: reading.stationId,
              station_name: reading.stationName,
              latitude: reading.latitude,
              longitude: reading.longitude,
              value: reading.value,
              reading_timestamp: reading.timestamp,
              fetched_at: reading.fetchedAt,
            })),
          )}
          ON CONFLICT (station_id) DO UPDATE SET
            station_name = EXCLUDED.station_name,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            value = EXCLUDED.value,
            reading_timestamp = EXCLUDED.reading_timestamp,
            fetched_at = EXCLUDED.fetched_at
          WHERE rainfall_latest.reading_timestamp IS DISTINCT FROM EXCLUDED.reading_timestamp
          RETURNING station_id AS "stationId"
        `;
        return changed.length;
      }).pipe(
        Effect.mapError(
          (cause) => new RainfallRepositoryError("save readings", cause),
        ),
      ),

    getLatestReadings: () =>
      Effect.gen(function* () {
        const rows = yield* sql<PostgresRainfallReadingRow>`
          SELECT ${selectColumns}
          FROM rainfall_latest
          WHERE reading_timestamp::timestamptz = (
            SELECT max(reading_timestamp::timestamptz) FROM rainfall_latest
          )
          ORDER BY station_id ASC
        `;
        return yield* decodeRows(rows);
      }).pipe(
        Effect.mapError(
          (cause) => new RainfallRepositoryError("get latest readings", cause),
        ),
      ),
  };

  return repository;
});

/** PostgreSQL implementation of the rainfall repository (one row per station). */
export const PostgresRainfallRepositoryLayer = Layer.effect(
  RainfallRepository,
  makePostgresRainfallRepository,
);

/** Creates a complete rainfall repository layer for any PostgreSQL URL. */
export const makePostgresRainfallRepositoryLayer = (databaseUrl: string) =>
  PostgresRainfallRepositoryLayer.pipe(
    Layer.provide(makePostgresClientLayer(databaseUrl)),
  );
