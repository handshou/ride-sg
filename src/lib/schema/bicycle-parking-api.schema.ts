import { Schema } from "effect";
import type { BicycleParkingResult } from "./bicycle-parking.schema";

/**
 * Bicycle Parking API Response Schemas
 */

/**
 * Success response from /api/bicycle-parking (interface-based)
 */
export interface BicycleParkingAPISuccessResponse {
  results: BicycleParkingResult[];
  query: {
    latitude: number;
    longitude: number;
  };
  count: number;
}

/**
 * Partial success response (allows missing fields for error cases)
 */
export const PartialBicycleParkingAPIResponseSchema = Schema.Struct({
  results: Schema.Array(
    Schema.Struct({
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
    }),
  ).pipe(Schema.optional),
  query: Schema.Struct({
    latitude: Schema.Number,
    longitude: Schema.Number,
  }).pipe(Schema.optional),
  count: Schema.Number.pipe(Schema.optional),
  error: Schema.String.pipe(Schema.optional),
  details: Schema.String.pipe(Schema.optional),
});

/**
 * Normalize partial response to success response with defaults
 * Maps over results to create mutable copies
 */
export const normalizeBicycleParkingAPIResponse = (
  partial: Schema.Schema.Type<typeof PartialBicycleParkingAPIResponseSchema>,
): BicycleParkingAPISuccessResponse => ({
  results: partial.results
    ? partial.results.map((r) => ({
        id: r.id,
        description: r.description,
        latitude: r.latitude,
        longitude: r.longitude,
        rackType: r.rackType,
        rackCount: r.rackCount,
        hasShelter: r.hasShelter,
        queryLatitude: r.queryLatitude,
        queryLongitude: r.queryLongitude,
        timestamp: r.timestamp,
      }))
    : [],
  query: partial.query ?? { latitude: 0, longitude: 0 },
  count: partial.count ?? 0,
});

/**
 * Type exports
 */
export type PartialBicycleParkingAPIResponse = Schema.Schema.Type<
  typeof PartialBicycleParkingAPIResponseSchema
>;
