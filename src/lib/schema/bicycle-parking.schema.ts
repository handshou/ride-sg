import { Schema } from "effect";

/**
 * Bicycle Parking Schema for LTA DataMall API
 *
 * This schema validates the response from Singapore's LTA DataMall
 * BicycleParkingv2 API endpoint.
 */

/**
 * Individual bicycle parking location
 */
export const BicycleParkingSchema = Schema.Struct({
  Description: Schema.String,
  Latitude: Schema.Number,
  Longitude: Schema.Number,
  RackType: Schema.String,
  RackCount: Schema.Number,
  ShelterIndicator: Schema.Literal("Y", "N"),
});

/**
 * LTA DataMall API Response format
 */
export const BicycleParkingResponseSchema = Schema.Struct({
  "odata.metadata": Schema.String,
  value: Schema.Array(BicycleParkingSchema),
});

/**
 * Type exports for use in application code
 */
export type BicycleParkingLocation = Schema.Schema.Type<
  typeof BicycleParkingSchema
>;
export type BicycleParkingResponse = Schema.Schema.Type<
  typeof BicycleParkingResponseSchema
>;

/**
 * Normalized bicycle parking result for internal use
 */
export interface BicycleParkingResult {
  id: string;
  description: string;
  latitude: number;
  longitude: number;
  rackType: string;
  rackCount: number;
  hasShelter: boolean;
  queryLatitude: number;
  queryLongitude: number;
  timestamp: number;
}
