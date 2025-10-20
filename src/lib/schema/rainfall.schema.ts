import { Schema } from "effect";

/**
 * Rainfall Schema Definitions
 *
 * Effect Schema types for NEA Singapore Rainfall API
 * API: https://api-open.data.gov.sg/v2/real-time/api/rainfall
 */

/**
 * Station location schema
 */
export const RainfallLocationSchema = Schema.Struct({
  latitude: Schema.Number,
  longitude: Schema.Number,
});

/**
 * Weather station schema
 */
export const RainfallStationSchema = Schema.Struct({
  id: Schema.String,
  deviceId: Schema.String,
  name: Schema.String,
  location: RainfallLocationSchema,
});

/**
 * Individual rainfall reading for a station
 */
export const RainfallReadingSchema = Schema.Struct({
  stationId: Schema.String,
  value: Schema.Number, // mm of rainfall
});

/**
 * Rainfall data with timestamp
 */
export const RainfallDataSchema = Schema.Struct({
  timestamp: Schema.String, // ISO 8601 format
  data: Schema.Array(RainfallReadingSchema),
});

/**
 * Complete API response schema
 */
export const RainfallResponseSchema = Schema.Struct({
  code: Schema.Number,
  data: Schema.Struct({
    stations: Schema.Array(RainfallStationSchema),
    readings: Schema.Array(RainfallDataSchema),
    readingType: Schema.String,
    readingUnit: Schema.String,
  }),
  errorMsg: Schema.String,
});

/**
 * Export TypeScript types
 */
export type RainfallLocation = Schema.Schema.Type<
  typeof RainfallLocationSchema
>;
export type RainfallStation = Schema.Schema.Type<typeof RainfallStationSchema>;
export type RainfallReading = Schema.Schema.Type<typeof RainfallReadingSchema>;
export type RainfallData = Schema.Schema.Type<typeof RainfallDataSchema>;
export type RainfallResponse = Schema.Schema.Type<
  typeof RainfallResponseSchema
>;

/**
 * Processed rainfall result for database storage
 */
export interface ProcessedRainfallReading {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  value: number;
  timestamp: string;
  fetchedAt: number;
}
