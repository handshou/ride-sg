import { Context, type Effect, Schema } from "effect";

/** Supported city partitions for persisted locations. */
export const LocationCitySchema = Schema.Literal("singapore", "jakarta");

/** Origin of a persisted location before it was stored. */
export const LocationSourceSchema = Schema.Literal("mapbox", "exa", "database");

/** Provider-neutral location returned by a location repository. */
export const LocationRecordSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  latitude: Schema.Number,
  longitude: Schema.Number,
  source: LocationSourceSchema,
  timestamp: Schema.Number,
  city: LocationCitySchema,
  isRandomizable: Schema.Boolean,
  postalCode: Schema.optional(Schema.String),
});

/** Provider-neutral input accepted when saving a location. */
export const SaveLocationInputSchema = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  latitude: Schema.Number,
  longitude: Schema.Number,
  source: LocationSourceSchema,
  timestamp: Schema.Number,
  city: LocationCitySchema,
  isRandomizable: Schema.optional(Schema.Boolean),
  postalCode: Schema.optional(Schema.String),
});

export type LocationCity = Schema.Schema.Type<typeof LocationCitySchema>;
export type LocationRecord = Schema.Schema.Type<typeof LocationRecordSchema>;
export type SaveLocationInput = Schema.Schema.Type<
  typeof SaveLocationInputSchema
>;

/** Identifies a failed provider-neutral location repository operation. */
export class LocationRepositoryError {
  readonly _tag = "LocationRepositoryError";

  constructor(
    readonly operation: string,
    readonly cause: unknown,
  ) {}
}

/** Database-independent persistence contract for saved map locations. */
export interface LocationRepositoryService {
  readonly searchLocations: (
    query: string,
    city?: LocationCity,
  ) => Effect.Effect<ReadonlyArray<LocationRecord>, LocationRepositoryError>;
  readonly listRandomizableLocations: (
    city: LocationCity,
  ) => Effect.Effect<ReadonlyArray<LocationRecord>, LocationRepositoryError>;
  readonly saveLocation: (
    input: SaveLocationInput,
  ) => Effect.Effect<LocationRecord, LocationRepositoryError>;
  readonly deleteLocation: (
    id: string,
  ) => Effect.Effect<void, LocationRepositoryError>;
}

/** Effect context tag used by application code instead of a database SDK. */
export class LocationRepository extends Context.Tag("LocationRepository")<
  LocationRepository,
  LocationRepositoryService
>() {}
