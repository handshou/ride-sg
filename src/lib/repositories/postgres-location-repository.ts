import { SqlClient } from "@effect/sql";
import { Effect, Layer, Schema } from "effect";
import { makePostgresClientLayer } from "../database/postgres-client-layer";
import {
  LocationRecordSchema,
  LocationRepository,
  LocationRepositoryError,
  type LocationRepositoryService,
  SaveLocationInputSchema,
} from "./location-repository";

interface PostgresLocationRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly source: "mapbox" | "exa" | "database";
  readonly timestamp: number;
  readonly city: "singapore" | "jakarta";
  readonly isRandomizable: boolean;
  readonly postalCode: string | null;
}

const decodePostgresLocationRows = (rows: ReadonlyArray<PostgresLocationRow>) =>
  Schema.decodeUnknown(Schema.Array(LocationRecordSchema))(
    rows.map((row) => ({
      ...row,
      postalCode: row.postalCode ?? undefined,
    })),
  );

const makePostgresLocationRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const selectLocationColumns = sql.unsafe(`
    id,
    title,
    description,
    latitude,
    longitude,
    source,
    timestamp::double precision AS timestamp,
    city,
    is_randomizable AS "isRandomizable",
    postal_code AS "postalCode"
  `);

  const repository: LocationRepositoryService = {
    searchLocations: (query, city) =>
      Effect.gen(function* () {
        const normalizedQuery = query.trim();
        if (normalizedQuery.length === 0) return [];

        const searchPattern = `%${normalizedQuery}%`;
        const rows = city
          ? yield* sql<PostgresLocationRow>`
              SELECT ${selectLocationColumns}
              FROM locations
              WHERE city = ${city}
                AND (title ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
              ORDER BY timestamp DESC
            `
          : yield* sql<PostgresLocationRow>`
              SELECT ${selectLocationColumns}
              FROM locations
              WHERE title ILIKE ${searchPattern} OR description ILIKE ${searchPattern}
              ORDER BY timestamp DESC
            `;

        return yield* decodePostgresLocationRows(rows);
      }).pipe(
        Effect.mapError(
          (cause) => new LocationRepositoryError("search locations", cause),
        ),
      ),

    listRandomizableLocations: (city) =>
      Effect.gen(function* () {
        const rows = yield* sql<PostgresLocationRow>`
          SELECT ${selectLocationColumns}
          FROM locations
          WHERE city = ${city} AND is_randomizable = true
          ORDER BY timestamp DESC
        `;

        return yield* decodePostgresLocationRows(rows);
      }).pipe(
        Effect.mapError(
          (cause) =>
            new LocationRepositoryError("list randomizable locations", cause),
        ),
      ),

    saveLocation: (unknownInput) =>
      Effect.gen(function* () {
        const input = yield* Schema.decodeUnknown(SaveLocationInputSchema)(
          unknownInput,
        );
        const id = crypto.randomUUID();
        const rows = yield* sql<PostgresLocationRow>`
          INSERT INTO locations (
            id,
            title,
            description,
            latitude,
            longitude,
            source,
            timestamp,
            city,
            is_randomizable,
            postal_code
          ) VALUES (
            ${id},
            ${input.title},
            ${input.description},
            ${input.latitude},
            ${input.longitude},
            ${input.source},
            ${input.timestamp},
            ${input.city},
            ${input.isRandomizable ?? false},
            ${input.postalCode ?? null}
          )
          ON CONFLICT (city, normalized_title)
          DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            source = EXCLUDED.source,
            timestamp = EXCLUDED.timestamp,
            is_randomizable = EXCLUDED.is_randomizable,
            postal_code = EXCLUDED.postal_code,
            updated_at = now()
          RETURNING ${selectLocationColumns}
        `;
        const decodedRows = yield* decodePostgresLocationRows(rows);
        const savedLocation = decodedRows[0];

        if (!savedLocation) {
          return yield* Effect.fail(
            new Error("PostgreSQL save location returned no row"),
          );
        }

        return savedLocation;
      }).pipe(
        Effect.mapError(
          (cause) => new LocationRepositoryError("save location", cause),
        ),
      ),

    deleteLocation: (id) =>
      sql`DELETE FROM locations WHERE id = ${id}`.pipe(
        Effect.asVoid,
        Effect.mapError(
          (cause) => new LocationRepositoryError("delete location", cause),
        ),
      ),
  };

  return repository;
});

/** PostgreSQL implementation of the provider-neutral location repository. */
export const PostgresLocationRepositoryLayer = Layer.effect(
  LocationRepository,
  makePostgresLocationRepository,
);

/** Creates a complete location repository layer for any PostgreSQL URL. */
export const makePostgresLocationRepositoryLayer = (databaseUrl: string) =>
  PostgresLocationRepositoryLayer.pipe(
    Layer.provide(makePostgresClientLayer(databaseUrl)),
  );
