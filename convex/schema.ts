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

  // Rainfall table - stores real-time rainfall data from NEA API
  rainfall: defineTable({
    stationId: v.string(),
    stationName: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    value: v.number(), // mm of rainfall
    timestamp: v.string(), // ISO 8601 from API
    fetchedAt: v.number(), // Unix timestamp when we fetched
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_station", ["stationId"])
    .index("by_fetched", ["fetchedAt"]),

  // Captured images table - stores photos taken from camera with AI analysis
  capturedImages: defineTable({
    imageUrl: v.string(), // Convex storage URL
    storageId: v.string(), // Convex storage ID for retrieval
    width: v.number(),
    height: v.number(),
    orientation: v.union(v.literal("portrait"), v.literal("landscape")),
    latitude: v.optional(v.number()), // Location where photo was taken
    longitude: v.optional(v.number()),
    deviceHeading: v.optional(v.number()), // Device compass heading when captured (0-360)
    cameraFov: v.optional(v.number()), // Camera field of view in degrees
    analysis: v.optional(v.string()), // AI-generated description/analysis
    analyzedObjects: v.optional(
      v.array(
        v.object({
          name: v.string(), // Object/landmark name
          confidence: v.optional(v.number()), // Detection confidence (0-1)
          bearing: v.optional(v.number()), // Estimated bearing from camera position
          distance: v.optional(v.number()), // Estimated distance in meters
          description: v.optional(v.string()), // Additional details
        }),
      ),
    ),
    analysisStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    capturedAt: v.number(), // Unix timestamp
  })
    .index("by_captured_at", ["capturedAt"])
    .index("by_location", ["latitude", "longitude"])
    .index("by_analysis_status", ["analysisStatus"]),
});
