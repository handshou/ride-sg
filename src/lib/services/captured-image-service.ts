import { Effect } from "effect";
import {
  type CapturedImageRecord,
  CapturedImageRepository,
  type CapturedImageRepositoryError,
  type CreateCapturedImageInput,
  type UpdateCapturedImageAnalysisInput,
} from "../repositories/captured-image-repository";
import {
  ImageBlobStore,
  type ImageBlobStoreError,
  type StoredImageBlob,
} from "../repositories/image-blob-store";

/** Metadata supplied alongside the uploaded bytes. */
export type UploadCapturedImageInput = Omit<CreateCapturedImageInput, "blobId">;

export type CapturedImageServiceError =
  | CapturedImageRepositoryError
  | ImageBlobStoreError;

/**
 * Captured Image Service
 *
 * Use-case layer over the CapturedImageRepository and ImageBlobStore ports.
 * Keeps blob and metadata writes paired so neither adapter leaks into routes
 * or server actions.
 */
export class CapturedImageService extends Effect.Service<CapturedImageService>()(
  "CapturedImageService",
  {
    effect: Effect.gen(function* () {
      const repository = yield* CapturedImageRepository;
      const blobStore = yield* ImageBlobStore;

      const listImages = () => repository.listImages();

      const getImage = (id: string) => repository.getImage(id);

      /** Returns the bytes for an image id, or undefined when unknown. */
      const getImageBlob = (
        id: string,
      ): Effect.Effect<
        StoredImageBlob | undefined,
        CapturedImageServiceError
      > =>
        Effect.gen(function* () {
          const image = yield* repository.getImage(id);
          if (!image) return undefined;
          return yield* blobStore.getBlob(image.blobId);
        });

      /** Returns a data URL suitable for vision APIs that cannot reach localhost. */
      const getImageDataUrl = (
        id: string,
      ): Effect.Effect<string | undefined, CapturedImageServiceError> =>
        Effect.map(getImageBlob(id), (blob) =>
          blob
            ? `data:${blob.contentType};base64,${Buffer.from(blob.bytes).toString("base64")}`
            : undefined,
        );

      const uploadImage = (
        contentType: string,
        bytes: Uint8Array,
        input: UploadCapturedImageInput,
      ): Effect.Effect<CapturedImageRecord, CapturedImageServiceError> =>
        Effect.gen(function* () {
          const blob = yield* blobStore.putBlob(contentType, bytes);
          return yield* repository
            .createImage({ ...input, blobId: blob.id })
            .pipe(
              // Roll back the orphaned blob if metadata insert fails
              Effect.tapError(() =>
                blobStore.deleteBlob(blob.id).pipe(Effect.ignore),
              ),
            );
        });

      const updateAnalysis = (
        id: string,
        input: UpdateCapturedImageAnalysisInput,
      ) => repository.updateAnalysis(id, input);

      const deleteImage = (
        id: string,
      ): Effect.Effect<void, CapturedImageServiceError> =>
        Effect.gen(function* () {
          const image = yield* repository.getImage(id);
          if (!image) return;
          yield* repository.deleteImage(id);
          yield* blobStore.deleteBlob(image.blobId);
        });

      return {
        listImages,
        getImage,
        getImageBlob,
        getImageDataUrl,
        uploadImage,
        updateAnalysis,
        deleteImage,
      } as const;
    }),
  },
) {}
