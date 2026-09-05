import { Context, type Effect } from "effect";

/** Raw image bytes plus the MIME type needed to serve them. */
export interface StoredImageBlob {
  readonly id: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

/** Identifies a failed image blob store operation. */
export class ImageBlobStoreError {
  readonly _tag = "ImageBlobStoreError";

  constructor(
    readonly operation: string,
    readonly cause: unknown,
  ) {}
}

/**
 * Storage-independent contract for captured image bytes.
 *
 * Metadata lives in CapturedImageRepository; this port only owns bytes so the
 * backing store (PostgreSQL bytea today, object storage later) can change on
 * its own.
 */
export interface ImageBlobStoreService {
  readonly putBlob: (
    contentType: string,
    bytes: Uint8Array,
  ) => Effect.Effect<StoredImageBlob, ImageBlobStoreError>;
  readonly getBlob: (
    id: string,
  ) => Effect.Effect<StoredImageBlob | undefined, ImageBlobStoreError>;
  readonly deleteBlob: (id: string) => Effect.Effect<void, ImageBlobStoreError>;
}

/** Effect context tag used by application code instead of a storage SDK. */
export class ImageBlobStore extends Context.Tag("ImageBlobStore")<
  ImageBlobStore,
  ImageBlobStoreService
>() {}
