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
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_source", ["source"]),
});
