import { Schema } from "effect";

/**
 * Search Result Schema
 *
 * Unified schema for search results from any source (Exa, Mapbox, Database)
 */

/**
 * Geographic coordinates
 */
export const CoordinatesSchema = Schema.Struct({
  latitude: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(-90),
    Schema.lessThanOrEqualTo(90),
  ),
  longitude: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(-180),
    Schema.lessThanOrEqualTo(180),
  ),
});

/**
 * Search result source
 */
export const SearchSourceSchema = Schema.Literal("mapbox", "exa", "database");

/**
 * Search result
 */
export const SearchResultSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  location: CoordinatesSchema,
  source: SearchSourceSchema,
  timestamp: Schema.Number,
  address: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
});

/**
 * Type exports
 */
export type Coordinates = Schema.Schema.Type<typeof CoordinatesSchema>;
export type SearchSource = Schema.Schema.Type<typeof SearchSourceSchema>;
export type SearchResult = Schema.Schema.Type<typeof SearchResultSchema>;
