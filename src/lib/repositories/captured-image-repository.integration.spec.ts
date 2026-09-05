import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { makePostgresClientLayer } from "../database/postgres-client-layer";
import { CapturedImageService } from "../services/captured-image-service";
import { PostgresCapturedImageRepositoryLayer } from "./postgres-captured-image-repository";
import { PostgresImageBlobStoreLayer } from "./postgres-image-blob-store";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://ride_sg:ride_sg@127.0.0.1:54329/ride_sg";

const layer = CapturedImageService.Default.pipe(
  Layer.provide(
    Layer.mergeAll(
      PostgresCapturedImageRepositoryLayer,
      PostgresImageBlobStoreLayer,
    ),
  ),
  Layer.provide(makePostgresClientLayer(databaseUrl, 2)),
);

describe("PostgreSQL CapturedImageService", () => {
  it("uploads bytes with metadata, updates analysis, and deletes both", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* CapturedImageService;
        const created = yield* service.uploadImage("image/jpeg", bytes, {
          width: 640,
          height: 480,
          orientation: "landscape",
          cameraGpsLatitude: 1.29,
          cameraGpsLongitude: 103.85,
          deviceHeading: 90,
          cameraFov: 60,
          capturedAt: 1_788_543_600_000,
        });
        const blob = yield* service.getImageBlob(created.id);
        const dataUrl = yield* service.getImageDataUrl(created.id);
        const updated = yield* service.updateAnalysis(created.id, {
          analysis: "A test image",
          analyzedObjects: [{ name: "Merlion", confidence: 0.9 }],
          analysisStatus: "completed",
          latitude: 1.2868,
          longitude: 103.8545,
        });
        const listed = yield* service.listImages();
        yield* service.deleteImage(created.id);
        const afterDelete = yield* service.getImage(created.id);
        const blobAfterDelete = yield* service.getImageBlob(created.id);
        return {
          created,
          blob,
          dataUrl,
          updated,
          listed,
          afterDelete,
          blobAfterDelete,
        };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.created).toMatchObject({
      analysisStatus: "not_analyzed",
      imageUrl: `/api/images/${result.created.id}/blob`,
      latitude: undefined,
    });
    expect(result.blob?.contentType).toBe("image/jpeg");
    expect(Array.from(result.blob?.bytes ?? [])).toEqual(Array.from(bytes));
    expect(result.dataUrl).toBe(
      `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`,
    );
    expect(result.updated).toMatchObject({
      analysisStatus: "completed",
      latitude: 1.2868,
      longitude: 103.8545,
      analyzedObjects: [{ name: "Merlion", confidence: 0.9 }],
    });
    expect(result.listed.some((image) => image.id === result.created.id)).toBe(
      true,
    );
    expect(result.afterDelete).toBeUndefined();
    expect(result.blobAfterDelete).toBeUndefined();
  });
});
