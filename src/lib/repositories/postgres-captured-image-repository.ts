import { SqlClient } from "@effect/sql";
import { Effect, Layer, Schema } from "effect";
import { makePostgresClientLayer } from "../database/postgres-client-layer";
import {
  type CapturedImageAnalysisStatus,
  type CapturedImageOrientation,
  type CapturedImageRecord,
  CapturedImageRecordSchema,
  CapturedImageRepository,
  CapturedImageRepositoryError,
  type CapturedImageRepositoryService,
  CreateCapturedImageInputSchema,
  capturedImageUrl,
  UpdateCapturedImageAnalysisInputSchema,
} from "./captured-image-repository";

interface PostgresCapturedImageRow {
  readonly id: string;
  readonly blobId: string;
  readonly width: number;
  readonly height: number;
  readonly orientation: CapturedImageOrientation;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly cameraGpsLatitude: number | null;
  readonly cameraGpsLongitude: number | null;
  readonly deviceHeading: number | null;
  readonly cameraFov: number | null;
  readonly analysis: string | null;
  readonly analyzedObjects: unknown | null;
  readonly analysisStatus: CapturedImageAnalysisStatus;
  readonly capturedAt: number;
}

const nullToUndefined = <T>(value: T | null): T | undefined =>
  value === null ? undefined : value;

/** jsonb may arrive pre-parsed or as text depending on driver type settings. */
const parseJsonColumn = (value: unknown): unknown => {
  if (typeof value !== "string") return nullToUndefined(value as unknown);
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const decodeRows = (rows: ReadonlyArray<PostgresCapturedImageRow>) =>
  Schema.decodeUnknown(Schema.Array(CapturedImageRecordSchema))(
    rows.map((row) => ({
      id: row.id,
      blobId: row.blobId,
      imageUrl: capturedImageUrl(row.id),
      width: row.width,
      height: row.height,
      orientation: row.orientation,
      latitude: nullToUndefined(row.latitude),
      longitude: nullToUndefined(row.longitude),
      cameraGpsLatitude: nullToUndefined(row.cameraGpsLatitude),
      cameraGpsLongitude: nullToUndefined(row.cameraGpsLongitude),
      deviceHeading: nullToUndefined(row.deviceHeading),
      cameraFov: nullToUndefined(row.cameraFov),
      analysis: nullToUndefined(row.analysis),
      analyzedObjects: parseJsonColumn(row.analyzedObjects),
      analysisStatus: row.analysisStatus,
      capturedAt: row.capturedAt,
    })),
  );

const makePostgresCapturedImageRepository = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const selectColumns = sql.unsafe(`
    id,
    blob_id AS "blobId",
    width,
    height,
    orientation,
    latitude,
    longitude,
    camera_gps_latitude AS "cameraGpsLatitude",
    camera_gps_longitude AS "cameraGpsLongitude",
    device_heading AS "deviceHeading",
    camera_fov AS "cameraFov",
    analysis,
    analyzed_objects AS "analyzedObjects",
    analysis_status AS "analysisStatus",
    captured_at::double precision AS "capturedAt"
  `);

  const firstRecord = (rows: ReadonlyArray<PostgresCapturedImageRow>) =>
    Effect.map(decodeRows(rows), (records) => records[0]);

  const repository: CapturedImageRepositoryService = {
    listImages: () =>
      Effect.gen(function* () {
        const rows = yield* sql<PostgresCapturedImageRow>`
          SELECT ${selectColumns}
          FROM captured_images
          ORDER BY captured_at DESC
        `;
        return yield* decodeRows(rows);
      }).pipe(
        Effect.mapError(
          (cause) => new CapturedImageRepositoryError("list images", cause),
        ),
      ),

    getImage: (id) =>
      Effect.gen(function* () {
        const rows = yield* sql<PostgresCapturedImageRow>`
          SELECT ${selectColumns}
          FROM captured_images
          WHERE id = ${id}
        `;
        return yield* firstRecord(rows);
      }).pipe(
        Effect.mapError(
          (cause) => new CapturedImageRepositoryError("get image", cause),
        ),
      ),

    createImage: (unknownInput) =>
      Effect.gen(function* () {
        const input = yield* Schema.decodeUnknown(
          CreateCapturedImageInputSchema,
        )(unknownInput);
        const id = crypto.randomUUID();
        const rows = yield* sql<PostgresCapturedImageRow>`
          INSERT INTO captured_images (
            id,
            blob_id,
            width,
            height,
            orientation,
            latitude,
            longitude,
            camera_gps_latitude,
            camera_gps_longitude,
            device_heading,
            camera_fov,
            analysis_status,
            captured_at
          ) VALUES (
            ${id},
            ${input.blobId},
            ${input.width},
            ${input.height},
            ${input.orientation},
            ${input.latitude ?? null},
            ${input.longitude ?? null},
            ${input.cameraGpsLatitude ?? null},
            ${input.cameraGpsLongitude ?? null},
            ${input.deviceHeading ?? null},
            ${input.cameraFov ?? null},
            ${"not_analyzed"},
            ${input.capturedAt}
          )
          RETURNING ${selectColumns}
        `;
        const record = yield* firstRecord(rows);
        if (!record) {
          return yield* Effect.fail(
            new Error("PostgreSQL create image returned no row"),
          );
        }
        return record;
      }).pipe(
        Effect.mapError(
          (cause) => new CapturedImageRepositoryError("create image", cause),
        ),
      ),

    updateAnalysis: (id, unknownInput) =>
      Effect.gen(function* () {
        const input = yield* Schema.decodeUnknown(
          UpdateCapturedImageAnalysisInputSchema,
        )(unknownInput);
        const hasNewPosition =
          input.latitude !== undefined && input.longitude !== undefined;
        const analyzedObjectsJson =
          input.analyzedObjects === undefined
            ? null
            : JSON.stringify(input.analyzedObjects);

        const rows = hasNewPosition
          ? yield* sql<PostgresCapturedImageRow>`
              UPDATE captured_images
              SET analysis = ${input.analysis},
                  analyzed_objects = ${analyzedObjectsJson}::jsonb,
                  analysis_status = ${input.analysisStatus},
                  latitude = ${input.latitude ?? null},
                  longitude = ${input.longitude ?? null},
                  updated_at = now()
              WHERE id = ${id}
              RETURNING ${selectColumns}
            `
          : yield* sql<PostgresCapturedImageRow>`
              UPDATE captured_images
              SET analysis = ${input.analysis},
                  analyzed_objects = ${analyzedObjectsJson}::jsonb,
                  analysis_status = ${input.analysisStatus},
                  updated_at = now()
              WHERE id = ${id}
              RETURNING ${selectColumns}
            `;
        return yield* firstRecord(rows);
      }).pipe(
        Effect.mapError(
          (cause) => new CapturedImageRepositoryError("update analysis", cause),
        ),
      ),

    deleteImage: (id) =>
      sql`DELETE FROM captured_images WHERE id = ${id}`.pipe(
        Effect.asVoid,
        Effect.mapError(
          (cause) => new CapturedImageRepositoryError("delete image", cause),
        ),
      ),
  };

  return repository;
});

/** PostgreSQL implementation of the captured image repository. */
export const PostgresCapturedImageRepositoryLayer = Layer.effect(
  CapturedImageRepository,
  makePostgresCapturedImageRepository,
);

/** Creates a complete captured image repository layer for any PostgreSQL URL. */
export const makePostgresCapturedImageRepositoryLayer = (databaseUrl: string) =>
  PostgresCapturedImageRepositoryLayer.pipe(
    Layer.provide(makePostgresClientLayer(databaseUrl)),
  );

export type { CapturedImageRecord };
