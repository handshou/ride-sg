import { SqlClient } from "@effect/sql";
import { Effect, Layer, Schema } from "effect";
import { makePostgresClientLayer } from "../database/postgres-client-layer";
import {
  type BicycleParkingCacheRecord,
  BicycleParkingCacheRecordSchema,
  BicycleParkingCacheRepository,
  BicycleParkingCacheRepositoryError,
  type BicycleParkingCacheRepositoryService,
} from "./bicycle-parking-cache-repository";

interface PostgresBicycleParkingCacheRow {
  readonly id: string;
  readonly description: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly rackType: string;
  readonly rackCount: number;
  readonly hasShelter: boolean;
  readonly queryLatitude: number;
  readonly queryLongitude: number;
  readonly timestamp: number;
}

const decodeRows = (rows: ReadonlyArray<PostgresBicycleParkingCacheRow>) =>
  Schema.decodeUnknown(Schema.Array(BicycleParkingCacheRecordSchema))(rows);

const makePostgresBicycleParkingCacheRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const selectColumns = sql.unsafe(`
    id,
    description,
    latitude,
    longitude,
    rack_type AS "rackType",
    rack_count AS "rackCount",
    has_shelter AS "hasShelter",
    query_latitude AS "queryLatitude",
    query_longitude AS "queryLongitude",
    fetched_at::double precision AS timestamp
  `);

  const repository: BicycleParkingCacheRepositoryService = {
    findNearQueryPoint: (area) =>
      Effect.gen(function* () {
        const rows = yield* sql<PostgresBicycleParkingCacheRow>`
          SELECT ${selectColumns}
          FROM bicycle_parking_cache
          WHERE query_latitude BETWEEN ${area.queryLatitude - area.thresholdDegrees}
            AND ${area.queryLatitude + area.thresholdDegrees}
            AND query_longitude BETWEEN ${area.queryLongitude - area.thresholdDegrees}
            AND ${area.queryLongitude + area.thresholdDegrees}
          ORDER BY fetched_at DESC, description ASC
        `;
        return yield* decodeRows(rows);
      }).pipe(
        Effect.mapError(
          (cause) =>
            new BicycleParkingCacheRepositoryError(
              "find near query point",
              cause,
            ),
        ),
      ),

    replaceForQueryPoint: (area, entries) =>
      sql
        .withTransaction(
          Effect.gen(function* () {
            yield* sql`
              DELETE FROM bicycle_parking_cache
              WHERE query_latitude BETWEEN ${area.queryLatitude - area.thresholdDegrees}
                AND ${area.queryLatitude + area.thresholdDegrees}
                AND query_longitude BETWEEN ${area.queryLongitude - area.thresholdDegrees}
                AND ${area.queryLongitude + area.thresholdDegrees}
            `;

            if (entries.length === 0) {
              return [] as ReadonlyArray<BicycleParkingCacheRecord>;
            }

            const rows = yield* sql<PostgresBicycleParkingCacheRow>`
              INSERT INTO bicycle_parking_cache ${sql.insert(
                entries.map((entry) => ({
                  id: crypto.randomUUID(),
                  description: entry.description,
                  latitude: entry.latitude,
                  longitude: entry.longitude,
                  rack_type: entry.rackType,
                  rack_count: entry.rackCount,
                  has_shelter: entry.hasShelter,
                  query_latitude: entry.queryLatitude,
                  query_longitude: entry.queryLongitude,
                  fetched_at: entry.timestamp,
                })),
              )}
              RETURNING ${selectColumns}
            `;
            return yield* decodeRows(rows);
          }),
        )
        .pipe(
          Effect.mapError(
            (cause) =>
              new BicycleParkingCacheRepositoryError(
                "replace for query point",
                cause,
              ),
          ),
        ),

    deleteOlderThan: (cutoffTimestamp) =>
      Effect.gen(function* () {
        const rows = yield* sql<{ readonly id: string }>`
          DELETE FROM bicycle_parking_cache
          WHERE fetched_at < ${cutoffTimestamp}
          RETURNING id
        `;
        return rows.length;
      }).pipe(
        Effect.mapError(
          (cause) =>
            new BicycleParkingCacheRepositoryError("delete older than", cause),
        ),
      ),
  };

  return repository;
});

/** PostgreSQL implementation of the bicycle parking cache repository. */
export const PostgresBicycleParkingCacheRepositoryLayer = Layer.effect(
  BicycleParkingCacheRepository,
  makePostgresBicycleParkingCacheRepository,
);

/** Creates a complete cache repository layer for any PostgreSQL URL. */
export const makePostgresBicycleParkingCacheRepositoryLayer = (
  databaseUrl: string,
) =>
  PostgresBicycleParkingCacheRepositoryLayer.pipe(
    Layer.provide(makePostgresClientLayer(databaseUrl)),
  );
