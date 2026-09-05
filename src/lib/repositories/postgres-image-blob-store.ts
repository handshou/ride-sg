import { SqlClient } from "@effect/sql";
import { Effect, Layer } from "effect";
import { makePostgresClientLayer } from "../database/postgres-client-layer";
import {
  ImageBlobStore,
  ImageBlobStoreError,
  type ImageBlobStoreService,
  type StoredImageBlob,
} from "./image-blob-store";

interface PostgresImageBlobRow {
  readonly id: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

const toStoredBlob = (row: PostgresImageBlobRow): StoredImageBlob => ({
  id: row.id,
  contentType: row.contentType,
  bytes: new Uint8Array(row.bytes),
});

const makePostgresImageBlobStore = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  const store: ImageBlobStoreService = {
    putBlob: (contentType, bytes) =>
      Effect.gen(function* () {
        const id = crypto.randomUUID();
        yield* sql`
          INSERT INTO image_blobs (id, content_type, bytes, byte_length)
          VALUES (${id}, ${contentType}, ${Buffer.from(bytes)}, ${bytes.byteLength})
        `;
        return { id, contentType, bytes } satisfies StoredImageBlob;
      }).pipe(
        Effect.mapError((cause) => new ImageBlobStoreError("put blob", cause)),
      ),

    getBlob: (id) =>
      Effect.gen(function* () {
        const rows = yield* sql<PostgresImageBlobRow>`
          SELECT id, content_type AS "contentType", bytes
          FROM image_blobs
          WHERE id = ${id}
        `;
        const row = rows[0];
        return row ? toStoredBlob(row) : undefined;
      }).pipe(
        Effect.mapError((cause) => new ImageBlobStoreError("get blob", cause)),
      ),

    deleteBlob: (id) =>
      sql`DELETE FROM image_blobs WHERE id = ${id}`.pipe(
        Effect.asVoid,
        Effect.mapError(
          (cause) => new ImageBlobStoreError("delete blob", cause),
        ),
      ),
  };

  return store;
});

/** PostgreSQL bytea implementation of the image blob store. */
export const PostgresImageBlobStoreLayer = Layer.effect(
  ImageBlobStore,
  makePostgresImageBlobStore,
);

/** Creates a complete blob store layer for any PostgreSQL URL. */
export const makePostgresImageBlobStoreLayer = (databaseUrl: string) =>
  PostgresImageBlobStoreLayer.pipe(
    Layer.provide(makePostgresClientLayer(databaseUrl)),
  );
