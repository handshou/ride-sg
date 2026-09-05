import { Context, type Effect, Schema } from "effect";

export const CapturedImageOrientationSchema = Schema.Literal(
  "portrait",
  "landscape",
);

export const CapturedImageAnalysisStatusSchema = Schema.Literal(
  "not_analyzed",
  "processing",
  "completed",
  "failed",
);

/** One object or landmark the vision model recognised in an image. */
export const AnalyzedObjectSchema = Schema.Struct({
  name: Schema.String,
  confidence: Schema.optional(Schema.Number),
  bearing: Schema.optional(Schema.Number),
  distance: Schema.optional(Schema.Number),
  description: Schema.optional(Schema.String),
});

/** Provider-neutral captured image metadata. Bytes live in ImageBlobStore. */
export const CapturedImageRecordSchema = Schema.Struct({
  id: Schema.String,
  blobId: Schema.String,
  /** App-relative URL that serves the image bytes. */
  imageUrl: Schema.String,
  width: Schema.Number,
  height: Schema.Number,
  orientation: CapturedImageOrientationSchema,
  latitude: Schema.optional(Schema.Number),
  longitude: Schema.optional(Schema.Number),
  cameraGpsLatitude: Schema.optional(Schema.Number),
  cameraGpsLongitude: Schema.optional(Schema.Number),
  deviceHeading: Schema.optional(Schema.Number),
  cameraFov: Schema.optional(Schema.Number),
  analysis: Schema.optional(Schema.String),
  analyzedObjects: Schema.optional(Schema.Array(AnalyzedObjectSchema)),
  analysisStatus: CapturedImageAnalysisStatusSchema,
  capturedAt: Schema.Number,
});

/** Metadata accepted when registering a freshly uploaded image. */
export const CreateCapturedImageInputSchema = Schema.Struct({
  blobId: Schema.String,
  width: Schema.Number,
  height: Schema.Number,
  orientation: CapturedImageOrientationSchema,
  latitude: Schema.optional(Schema.Number),
  longitude: Schema.optional(Schema.Number),
  cameraGpsLatitude: Schema.optional(Schema.Number),
  cameraGpsLongitude: Schema.optional(Schema.Number),
  deviceHeading: Schema.optional(Schema.Number),
  cameraFov: Schema.optional(Schema.Number),
  capturedAt: Schema.Number,
});

/** Analysis fields written after the vision pipeline finishes or fails. */
export const UpdateCapturedImageAnalysisInputSchema = Schema.Struct({
  analysis: Schema.String,
  analyzedObjects: Schema.optional(Schema.Array(AnalyzedObjectSchema)),
  analysisStatus: CapturedImageAnalysisStatusSchema,
  /** When both are present the image is moved to the geocoded position. */
  latitude: Schema.optional(Schema.Number),
  longitude: Schema.optional(Schema.Number),
});

export type CapturedImageOrientation = Schema.Schema.Type<
  typeof CapturedImageOrientationSchema
>;
export type CapturedImageAnalysisStatus = Schema.Schema.Type<
  typeof CapturedImageAnalysisStatusSchema
>;
export type AnalyzedObject = Schema.Schema.Type<typeof AnalyzedObjectSchema>;
export type CapturedImageRecord = Schema.Schema.Type<
  typeof CapturedImageRecordSchema
>;
export type CreateCapturedImageInput = Schema.Schema.Type<
  typeof CreateCapturedImageInputSchema
>;
export type UpdateCapturedImageAnalysisInput = Schema.Schema.Type<
  typeof UpdateCapturedImageAnalysisInputSchema
>;

/** Builds the app-relative URL that serves a captured image's bytes. */
export const capturedImageUrl = (imageId: string) =>
  `/api/images/${imageId}/blob`;

/** Identifies a failed captured image repository operation. */
export class CapturedImageRepositoryError {
  readonly _tag = "CapturedImageRepositoryError";

  constructor(
    readonly operation: string,
    readonly cause: unknown,
  ) {}
}

/** Database-independent persistence contract for captured image metadata. */
export interface CapturedImageRepositoryService {
  /** All images, newest capture first. */
  readonly listImages: () => Effect.Effect<
    ReadonlyArray<CapturedImageRecord>,
    CapturedImageRepositoryError
  >;
  readonly getImage: (
    id: string,
  ) => Effect.Effect<
    CapturedImageRecord | undefined,
    CapturedImageRepositoryError
  >;
  readonly createImage: (
    input: CreateCapturedImageInput,
  ) => Effect.Effect<CapturedImageRecord, CapturedImageRepositoryError>;
  readonly updateAnalysis: (
    id: string,
    input: UpdateCapturedImageAnalysisInput,
  ) => Effect.Effect<
    CapturedImageRecord | undefined,
    CapturedImageRepositoryError
  >;
  /** Removes metadata only. Callers delete the blob through ImageBlobStore. */
  readonly deleteImage: (
    id: string,
  ) => Effect.Effect<void, CapturedImageRepositoryError>;
}

/** Effect context tag used by application code instead of a database SDK. */
export class CapturedImageRepository extends Context.Tag(
  "CapturedImageRepository",
)<CapturedImageRepository, CapturedImageRepositoryService>() {}
