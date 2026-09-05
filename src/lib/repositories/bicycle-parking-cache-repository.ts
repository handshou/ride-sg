import { Context, type Effect, Schema } from "effect";

/** Provider-neutral cached bicycle parking entry returned by the repository. */
export const BicycleParkingCacheRecordSchema = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
  latitude: Schema.Number,
  longitude: Schema.Number,
  rackType: Schema.String,
  rackCount: Schema.Number,
  hasShelter: Schema.Boolean,
  queryLatitude: Schema.Number,
  queryLongitude: Schema.Number,
  timestamp: Schema.Number,
});

/** Provider-neutral input accepted when caching a bicycle parking entry. */
export const BicycleParkingCacheInputSchema =
  BicycleParkingCacheRecordSchema.omit("id");

export type BicycleParkingCacheRecord = Schema.Schema.Type<
  typeof BicycleParkingCacheRecordSchema
>;
export type BicycleParkingCacheInput = Schema.Schema.Type<
  typeof BicycleParkingCacheInputSchema
>;

/** Square bounding box (in degrees) around an LTA query point. */
export interface QueryPointArea {
  readonly queryLatitude: number;
  readonly queryLongitude: number;
  /** Half-width of the bounding box in degrees. 0.01 is roughly 1 km. */
  readonly thresholdDegrees: number;
}

/** Identifies a failed bicycle parking cache operation. */
export class BicycleParkingCacheRepositoryError {
  readonly _tag = "BicycleParkingCacheRepositoryError";

  constructor(
    readonly operation: string,
    readonly cause: unknown,
  ) {}
}

/** Database-independent cache contract for LTA bicycle parking lookups. */
export interface BicycleParkingCacheRepositoryService {
  /** Returns cached entries whose query point falls inside the area. */
  readonly findNearQueryPoint: (
    area: QueryPointArea,
  ) => Effect.Effect<
    ReadonlyArray<BicycleParkingCacheRecord>,
    BicycleParkingCacheRepositoryError
  >;
  /** Replaces every cached entry inside the area with the given entries. */
  readonly replaceForQueryPoint: (
    area: QueryPointArea,
    entries: ReadonlyArray<BicycleParkingCacheInput>,
  ) => Effect.Effect<
    ReadonlyArray<BicycleParkingCacheRecord>,
    BicycleParkingCacheRepositoryError
  >;
  /** Deletes entries fetched before the given Unix millisecond timestamp. */
  readonly deleteOlderThan: (
    cutoffTimestamp: number,
  ) => Effect.Effect<number, BicycleParkingCacheRepositoryError>;
}

/** Effect context tag used by application code instead of a database SDK. */
export class BicycleParkingCacheRepository extends Context.Tag(
  "BicycleParkingCacheRepository",
)<BicycleParkingCacheRepository, BicycleParkingCacheRepositoryService>() {}
