import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Schema Definition
 *
 * This defines the structure of tables in your Convex database.
 */
export default defineSchema({
  // Locations table - stores saved search results
  locations: defineTable({
    title: v.string(),
    description: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    source: v.union(
      v.literal("mapbox"),
      v.literal("exa"),
      v.literal("database"),
    ),
    timestamp: v.number(),
    isRandomizable: v.optional(v.boolean()), // Flag for random selection
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_source", ["source"]),

  // Bicycle parking table - stores cached bicycle parking locations
  bicycleParking: defineTable({
    description: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    rackType: v.string(),
    rackCount: v.number(),
    shelterIndicator: v.string(),
    queryLatitude: v.number(), // For cache lookup
    queryLongitude: v.number(), // For cache lookup
    timestamp: v.number(),
  })
    .index("by_query_location", ["queryLatitude", "queryLongitude"])
    .index("by_timestamp", ["timestamp"]),
});
