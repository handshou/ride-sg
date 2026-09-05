import { Migrator, SqlClient } from "@effect/sql";
import { Effect } from "effect";

const runStatements = (
  statements: ReadonlyArray<string>,
): Effect.Effect<void, unknown, SqlClient.SqlClient> =>
  Effect.flatMap(SqlClient.SqlClient, (sql) =>
    Effect.forEach(statements, (statement) => sql.unsafe(statement), {
      discard: true,
    }),
  );

const createLocationsTableMigration = runStatements([
  `CREATE TABLE locations (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    normalized_title TEXT GENERATED ALWAYS AS (lower(btrim(title))) STORED,
    description TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    source TEXT NOT NULL CHECK (source IN ('mapbox', 'exa', 'database')),
    timestamp BIGINT NOT NULL,
    city TEXT NOT NULL CHECK (city IN ('singapore', 'jakarta')),
    is_randomizable BOOLEAN NOT NULL DEFAULT false,
    postal_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (city, normalized_title)
  )`,
]);

const createLocationsIndexesMigration = runStatements([
  `CREATE INDEX locations_city_randomizable_idx
   ON locations (city, is_randomizable)`,
  `CREATE INDEX locations_timestamp_idx
   ON locations (timestamp DESC)`,
]);

const createBicycleParkingCacheMigration = runStatements([
  `CREATE TABLE bicycle_parking_cache (
    id UUID PRIMARY KEY,
    description TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    rack_type TEXT NOT NULL,
    rack_count INTEGER NOT NULL,
    has_shelter BOOLEAN NOT NULL,
    query_latitude DOUBLE PRECISION NOT NULL,
    query_longitude DOUBLE PRECISION NOT NULL,
    fetched_at BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX bicycle_parking_cache_query_point_idx
   ON bicycle_parking_cache (query_latitude, query_longitude)`,
  `CREATE INDEX bicycle_parking_cache_fetched_at_idx
   ON bicycle_parking_cache (fetched_at)`,
]);

const createRainfallReadingsMigration = runStatements([
  `CREATE TABLE rainfall_readings (
    id UUID PRIMARY KEY,
    station_id TEXT NOT NULL,
    station_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    reading_timestamp TEXT NOT NULL,
    fetched_at BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX rainfall_readings_fetched_at_idx
   ON rainfall_readings (fetched_at DESC)`,
  `CREATE INDEX rainfall_readings_station_idx
   ON rainfall_readings (station_id, fetched_at DESC)`,
]);

const createCapturedImagesMigration = runStatements([
  `CREATE TABLE image_blobs (
    id UUID PRIMARY KEY,
    content_type TEXT NOT NULL,
    bytes BYTEA NOT NULL,
    byte_length INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE captured_images (
    id UUID PRIMARY KEY,
    blob_id UUID NOT NULL REFERENCES image_blobs (id) ON DELETE RESTRICT,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    orientation TEXT NOT NULL CHECK (orientation IN ('portrait', 'landscape')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    camera_gps_latitude DOUBLE PRECISION,
    camera_gps_longitude DOUBLE PRECISION,
    device_heading DOUBLE PRECISION,
    camera_fov DOUBLE PRECISION,
    analysis TEXT,
    analyzed_objects JSONB,
    analysis_status TEXT NOT NULL
      CHECK (analysis_status IN ('not_analyzed', 'processing', 'completed', 'failed')),
    captured_at BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX captured_images_captured_at_idx
   ON captured_images (captured_at DESC)`,
  `CREATE INDEX captured_images_analysis_status_idx
   ON captured_images (analysis_status)`,
]);

const replaceRainfallWithLatestSnapshotMigration = runStatements([
  `CREATE TABLE IF NOT EXISTS rainfall_latest (
    station_id TEXT PRIMARY KEY,
    station_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    reading_timestamp TEXT NOT NULL,
    fetched_at BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Per-fetch history grew with page traffic, not with NEA data. Nothing
  // reads history, so the append-only table goes away.
  `DROP TABLE IF EXISTS rainfall_readings`,
]);

/** Runs forward-only PostgreSQL migrations for every repository adapter. */
export const runPostgresMigrations = Migrator.make({})({
  loader: Migrator.fromRecord({
    "0001_create_locations_table": createLocationsTableMigration,
    "0002_create_locations_indexes": createLocationsIndexesMigration,
    "0003_create_bicycle_parking_cache": createBicycleParkingCacheMigration,
    "0004_create_rainfall_readings": createRainfallReadingsMigration,
    "0005_create_captured_images": createCapturedImagesMigration,
    "0006_replace_rainfall_with_latest_snapshot":
      replaceRainfallWithLatestSnapshotMigration,
  }),
});
