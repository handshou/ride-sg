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

/** Database-independent persistence contract for NEA rainfall readings. */
export interface RainfallRepositoryService {
  /** Stores one fetched batch of readings. All readings share `fetchedAt`. */
  readonly saveReadings: (
    readings: ReadonlyArray<RainfallReadingRecord>,
  ) => Effect.Effect<void, RainfallRepositoryError>;
  /** Returns the most recently fetched batch, or an empty array. */
  readonly getLatestReadings: () => Effect.Effect<
    ReadonlyArray<RainfallReadingRecord>,
    RainfallRepositoryError
  >;
  /** Deletes readings fetched before the given Unix millisecond timestamp. */
  readonly deleteOlderThan: (
    cutoffTimestamp: number,
  ) => Effect.Effect<number, RainfallRepositoryError>;
}

/** Effect context tag used by application code instead of a database SDK. */
export class RainfallRepository extends Context.Tag("RainfallRepository")<
  RainfallRepository,
  RainfallRepositoryService
>() {}
