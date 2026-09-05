import { Context, type Effect, Schema } from "effect";

/** Provider-neutral rainfall reading for one station at one fetch time. */
export const RainfallReadingRecordSchema = Schema.Struct({
  stationId: Schema.String,
  stationName: Schema.String,
  latitude: Schema.Number,
  longitude: Schema.Number,
  /** Rainfall in millimetres. */
  value: Schema.Number,
  /** ISO 8601 reading time reported by NEA. */
  timestamp: Schema.String,
  /** Unix millisecond timestamp when the app fetched the reading. */
  fetchedAt: Schema.Number,
});

export type RainfallReadingRecord = Schema.Schema.Type<
  typeof RainfallReadingRecordSchema
>;

/** Identifies a failed rainfall repository operation. */
export class RainfallRepositoryError {
  readonly _tag = "RainfallRepositoryError";

  constructor(
    readonly operation: string,
    readonly cause: unknown,
  ) {}
}

/**
 * Database-independent persistence contract for the latest NEA rainfall
 * snapshot.
 *
 * The store keeps exactly one row per station. Saving a batch upserts each
 * station and leaves rows untouched when the NEA reading timestamp has not
 * changed, so repeated page renders between NEA updates cost no writes.
 */
export interface RainfallRepositoryService {
  /** Upserts one fetched batch. Returns how many station rows changed. */
  readonly saveReadings: (
    readings: ReadonlyArray<RainfallReadingRecord>,
  ) => Effect.Effect<number, RainfallRepositoryError>;
  /**
   * Returns every station from the most recent NEA reading timestamp, or an
   * empty array. Stations missing from the latest batch are excluded.
   */
  readonly getLatestReadings: () => Effect.Effect<
    ReadonlyArray<RainfallReadingRecord>,
    RainfallRepositoryError
  >;
}

/** Effect context tag used by application code instead of a database SDK. */
export class RainfallRepository extends Context.Tag("RainfallRepository")<
  RainfallRepository,
  RainfallRepositoryService
>() {}
