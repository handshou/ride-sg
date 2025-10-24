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
 * Strict search result schema (all fields required)
 */
export const SearchResultSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  location: CoordinatesSchema,
  source: SearchSourceSchema,
  timestamp: Schema.Number,
  address: Schema.String,
  url: Schema.String,
  distance: Schema.Number, // Distance in meters from reference point
});

/**
 * Partial search result schema for input (allows missing fields)
 */
export const PartialSearchResultSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  location: CoordinatesSchema,
  source: SearchSourceSchema,
  timestamp: Schema.Number,
  address: Schema.String.pipe(Schema.optional),
  url: Schema.String.pipe(Schema.optional),
  distance: Schema.Number.pipe(Schema.optional),
});

/**
 * Normalize partial search result to complete result with defaults
 */
export const normalizeSearchResult = (
  partial: Schema.Schema.Type<typeof PartialSearchResultSchema>,
): SearchResult => ({
  id: partial.id,
  title: partial.title,
  description: partial.description,
  location: partial.location,
  source: partial.source,
  timestamp: partial.timestamp,
  address: partial.address ?? "",
  url: partial.url ?? "",
  distance: partial.distance ?? 0,
});

/**
 * Type exports
 */
export type Coordinates = Schema.Schema.Type<typeof CoordinatesSchema>;
export type SearchSource = Schema.Schema.Type<typeof SearchSourceSchema>;
export type SearchResult = Schema.Schema.Type<typeof SearchResultSchema>;
export type PartialSearchResult = Schema.Schema.Type<
  typeof PartialSearchResultSchema
>;
